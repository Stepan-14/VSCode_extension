import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	const buildDisposable = vscode.commands.registerCommand('autobuilder-for-c.buildProject', async () => {
		// Вызываем команду VS Code, которая сохраняет все измененные файлы
		// await заставляет плагин дождаться, пока все файлы сохранятся
		await vscode.commands.executeCommand('workbench.action.files.saveAll');

		// Проверяем, открыта ли рабочая папка
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('Ошибка: Рабочая папка не открыта в VS Code');
			return;
		}

		const rootPath = workspaceFolders[0].uri.fsPath;

		// Проверяем наличие главных файлов для сборки
		const cmakePath = path.join(rootPath, 'CMakeLists.txt');
		const mainCppPath = path.join(rootPath, 'bin', 'main.cpp');

		if (!fs.existsSync(cmakePath) || !fs.existsSync(mainCppPath)) {
			vscode.window.showErrorMessage('Ошибка сборки: В проекте отсутствуют необходимые CMakeLists.txt или bin/main.cpp. Рекомендуется проверить структуру проекта или использовать комманду CMake: Create basic project structure');
			return;
		}

		// Находим или создаем терминал нашего плагина
		let terminal = vscode.window.activeTerminal;

		// Если ни одного терминала вообще не открыто, создаем терминал
		if (!terminal) {
			terminal = vscode.window.createTerminal();
		}

		// Показываем терминал на экране
		terminal.show();

		// Проверка папки build и выбор сценария действий
		const buildFolderPath = path.join(rootPath, 'build');

		if (fs.existsSync(buildFolderPath)) {
			// Если папка build уже создана — запускаем сборку
			vscode.window.showInformationMessage('Папка build найдена. Запускается быстрая сборка...');
			terminal.sendText('cmake --build build');
		} else {
			// Если папки build нет — сначала конфигурируем CMake (-B build), затем собираем
			vscode.window.showInformationMessage('Папка build не найдена. Полная конфигурация и сборка...');
			terminal.sendText('cmake -B build && cmake --build build');
		}
	});

	// Регистрация команды, которая создаёт базовую структуру проекта: папки, файлы cmake, main.cpp и README.md
	const createStructureDisposable = vscode.commands.registerCommand('autobuilder-for-c.createStructure', () => {
		// Проверяем, открыта ли папка в VS Code
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('Пожалуйста, сначала откройте пустую папку в VS Code!');
			return;
		}

		// Получаем абсолютный путь к открытой папке
		const rootPath = workspaceFolders[0].uri.fsPath;

		// // проверка директории на пустоту
		// try {
		// 	const directoryContents = fs.readdirSync(rootPath);

		// 	// Если в папке уже есть файлы или другие папки, то выдаем ошибку и останавливаем плагин
		// 	if (directoryContents.length > 0) {
		// 		vscode.window.showErrorMessage('Ошибка: Папка проекта не пуста! Генерация структуры невозможна.');
		// 		return;
		// 	}
		// } catch (error) {
		// 	vscode.window.showErrorMessage('Не удалось прочитать содержимое директории.');
		// 	return;
		// }

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
			vscode.window.showInformationMessage('Недостающие элементы структуры проекта успешно восстановлены!');
		} else {
			vscode.window.showWarningMessage('Все папки и файлы структуры уже созданы. Ничего не изменено.');
		}
	});

	context.subscriptions.push(buildDisposable);
	context.subscriptions.push(createStructureDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
