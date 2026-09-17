import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	const buildDisposable = vscode.commands.registerCommand('autobuilder-for-c.buildProject', async () => {
		// Проверяем, открыта ли рабочая папка
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('Ошибка: Рабочая папка не открыта в VS Code');
			return;
		}

		const rootPath = workspaceFolders[0].uri.fsPath;
		const binPath = path.join(rootPath, 'bin');

		// Проверяем наличие директории bin - папки с компилиремыми файлами
		// Если папки нет - возвращаем ошибку
		if (!fs.existsSync(binPath) || !fs.statSync(binPath).isDirectory()) {
			vscode.window.showErrorMessage('Отсутствует директория /bin');
			return;
		}

		//Создаём список потенциально компилируемых файлов
		let waysToBuildTheProject: string[] = [];

		// Проверяем наличие CMakeLists.txt в корне. Если есть - добавляем в waysToBuildTheProject как вариант сборки проекта
		const cmakePath = path.join(rootPath, 'CMakeLists.txt');
		if (fs.existsSync(cmakePath)) {
			waysToBuildTheProject.push('CMake: Build the entire project');
		}

		// Читаем список элементов внутри папки bin
		const items = fs.readdirSync(binPath);
		// Перебираем найденные элементы
		for (const item of items) {
			const fullPath = path.join(binPath, item);

			// Проверяем, что это файл, а не директория
			if (fs.statSync(fullPath).isFile()) {
				// находим расширение файла
				const ext = path.extname(item).toLowerCase();

				// Если расширение файла совпадает с C/C++ - добавляем в массив
				if (ext === '.cpp' || ext === '.c' || ext === '.cc') {
					waysToBuildTheProject.push(`Build file: bin/${item}`);
				}
			}
		}

		// Если в корне есть CMakeLists, но в /bin нет ни одного c/cpp файла 
		// или waysToBuildTheProject вовсе пустой - возвращаем ошибку
		if (waysToBuildTheProject.length === 1 && waysToBuildTheProject[0] === 'CMake: Build the entire project' || waysToBuildTheProject.length === 0) {
			vscode.window.showErrorMessage('Отсутствуют c/cpp файлы в /bin');
			return;
		}
		// Если файл c/cpp один, то билдим его без выбора в меню
		else if (waysToBuildTheProject.length === 1 && waysToBuildTheProject[0] !== 'CMake: Build the entire project') {
			if (await BuildSingleFileFromMenuOption(waysToBuildTheProject[0], rootPath)) {
				return;
			}
		}

		// Открываем меню с выбором варианта как билдить проект
		const selectedOption = await vscode.window.showQuickPick(waysToBuildTheProject, {
			placeHolder: 'Выберите, что именно вы хотите скомпилировать и запустить:'
		});

		// Если пользователь нажал Esc или отменил выбор - выходим
		if (!selectedOption) {
			return;
		}

		// Проверяем, что выбрал пользователь и собираем проект
		if (selectedOption === 'CMake: Build the entire project') {
			const runTerminal = RunTerminal('Project');

			// Проверяем наличие bin/main.cpp для сборки
			const mainCppPath = path.join(rootPath, 'bin', 'main.cpp');

			if (!fs.existsSync(mainCppPath)) {
				vscode.window.showErrorMessage('Ошибка сборки: В проекте отсутствует необходимый файл bin/main.cpp. Рекомендуется проверить структуру проекта или использовать комманду CMake: Create basic project structure');
				return;
			}

			// Вызываем команду VS Code, которая сохраняет все измененные файлы
			await vscode.commands.executeCommand('workbench.action.files.saveAll');

			// Получение названия проекта из CMakeLists.txt
			let projectName = 'MyProject'; // Имя по умолчанию
			try {
				const cmakeContent = fs.readFileSync(cmakePath, 'utf8');
				// Ищем строчку вида project(ИмяПроекта)
				const match = cmakeContent.match(/project\s*\(\s*([a-zA-Z0-9_-]+)\s*\)/i);

				if (match && match[1]) {
					projectName = match[1]; // Забираем то, что попало в круглые скобки
				}
			} catch (error) {
				console.error('Не удалось прочитать CMakeLists.txt:', error);
			}

			// В зависимости от операционной системы запускаем исполняемый файл
			let runCommand = '';
			if (process.platform === 'win32') {
				// Для Windows добавляем .exe
				runCommand = `build\\bin\\${projectName}.exe`;
			} else {
				// Для Linux и macOS добавляем ./ в начале
				runCommand = `./build/bin/${projectName}`;
			}

			// Проверка папки build и выбор сценария действий
			const buildFolderPath = path.join(rootPath, 'build');
			if (fs.existsSync(buildFolderPath)) {
				// Если папка build уже создана - запускаем сборку
				runTerminal.sendText(`cd "${rootPath}" && cmake --build build && ${runCommand}`);
			} else {
				// Если папки build нет - сначала конфигурируем CMake (-B build), затем собираем
				runTerminal.sendText(`cd "${rootPath}" && cmake -B build && cmake --build build && ${runCommand}`);
			}
		}

		else if (selectedOption.startsWith('Build file:')) {
			if (await BuildSingleFileFromMenuOption(selectedOption, rootPath)) {
				return;
			}
		}
	});

	// Регистрация команды, которая создаёт базовую структуру проекта: папки, файлы cmake, main.cpp и README.md
	const createStructureDisposable = vscode.commands.registerCommand('autobuilder-for-c.createStructure', () => {
		// Проверяем, открыта ли папка в VS Code
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('Пожалуйста, сначала откройте пустую папку в VS Code');
			return;
		}

		// Получаем абсолютный путь к открытой папке
		const rootPath = workspaceFolders[0].uri.fsPath;

		// Список всех директорий, которые необходимо создать
		const foldersToCreate = ['docs', 'lib', 'bin', 'test'];

		// Проверяем и создаем только НАДОСТАЮЩИЕ папки
		for (const folderName of foldersToCreate) {
			const folderPath = path.join(rootPath, folderName);
			if (!fs.existsSync(folderPath)) {
				fs.mkdirSync(folderPath, { recursive: true });
			}
		}

		// План файлов и их базовое содержимое
		const filesToCreate = [
			{
				relPath: '.gitignore',
				content: 'build/\n.vscode/\nbin/*.exe\n'
			},
			{
				relPath: 'CMakeLists.txt',
				content: 'cmake_minimum_required(VERSION 3.10)\nset(CMAKE_C_COMPILER "clang")\nset(CMAKE_CXX_COMPILER "clang++")\n\nproject(MyProject)\nset(CMAKE_CXX_STANDARD 20)\n\nadd_subdirectory(lib)\nadd_subdirectory(bin)\n'
			},
			{
				relPath: path.join('docs', 'README.md'),
				content: '# Документация\n\nОписание вашего C/C++ проекта.'
			},
			{
				relPath: path.join('lib', 'CMakeLists.txt'),
				content: '# Конфигурация для внешних библиотек (lib)\n# add_library(<lib_name> <lib_file>.cpp)'
			},
			{
				relPath: path.join('bin', 'CMakeLists.txt'),
				content: 'add_executable(${CMAKE_PROJECT_NAME} main.cpp)\ntarget_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../ lib)\n# target_link_libraries(${CMAKE_PROJECT_NAME} PUBLIC <lib_name>) \n'
			},
			{
				relPath: path.join('bin', 'main.cpp'),
				content: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from AutoBuilder!" << std::endl;\n    return 0;\n}\n'
			}
		];

		// Флаг, чтобы узнать, создали ли мы хоть один новый файл
		let createdAnything = false;

		// Проверяем и создаем только недостающие файлы
		for (const fileInfo of filesToCreate) {
			const filePath = path.join(rootPath, fileInfo.relPath);

			// Создаём те файлы, которые ещё не созданы
			if (!fs.existsSync(filePath)) {
				fs.writeFileSync(filePath, fileInfo.content, 'utf8');
				createdAnything = true;
			}
		}

		// Логика уведомлений в зависимости от того, что произошло
		if (createdAnything) {
			vscode.window.showInformationMessage('Недостающие элементы структуры проекта восстановлены');
		} else {
			vscode.window.showWarningMessage('Все папки и файлы структуры уже созданы.');
		}
	});

	context.subscriptions.push(buildDisposable);
	context.subscriptions.push(createStructureDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Функция, запускающая терминал с переданным названием (или показывающая имеющийся)
function RunTerminal(terminalName: string) {
	// Терминал для запуска (ищем созданный ранее или открываем новый)
	let runTerminal = vscode.window.terminals.find(t => t.name === `${terminalName}`);
	if (!runTerminal) {
		runTerminal = vscode.window.createTerminal(`${terminalName}`);
	}
	runTerminal.show();
	return runTerminal;
}

// Функция компилирует одиночные файлы (без структуры cmake) в папку bin, используя clang++
async function BuildSingleFileFromMenuOption(selectedOption:string, rootPath:string) {
	// Вызываем команду VS Code, которая сохраняет все измененные файлы
	await vscode.commands.executeCommand('workbench.action.files.saveAll');

	const binPath = path.join(rootPath, 'bin');
	const runTerminal = RunTerminal('Project');
	const filename = selectedOption.replace('Build file: bin/', '');
	const filePath = path.join(binPath, filename);
	const fileNameWithoutExt = path.basename(filename, path.extname(filename));

	// Подготавливаем имена для исполняемого файла под разные ОС
	let outputBinary = fileNameWithoutExt;
	let runCommand = `./${fileNameWithoutExt}`;

	if (process.platform === 'win32') {
		outputBinary = `${fileNameWithoutExt}.exe`;
		runCommand = `${fileNameWithoutExt}.exe`;
	}

	// Компилируем этот файл в папке bin и запускаем
	const compileCmd = `clang++ "${filePath}" -o "${outputBinary}"`;

	runTerminal.sendText(`cd ${binPath} && ${compileCmd} && ${runCommand}`);

	return 1;
}