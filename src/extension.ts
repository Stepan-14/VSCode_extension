import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	// console.log('Congratulations, your extension "autobuilder-for-c" is now active!');

	const buildDisposable = vscode.commands.registerCommand('autobuilder-for-c.buildProject', () => {
		// vscode.window.showInformationMessage('Hello World from AutoBuilder for c++!');

		
	});

	const createStructureDisposable = vscode.commands.registerCommand('autobuilder-for-c.createStructure', () => {

		// Проверяем, открыта ли папка в VS Code
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('Пожалуйста, сначала откройте пустую папку в VS Code!');
			return;
		}

		// Получаем абсолютный путь к открытой папке
		const rootPath = workspaceFolders[0].uri.fsPath;

		// Список всех директорий, которые необходимо создать
		const foldersToCreate = ['docs', 'lib', 'bin', 'test'];

		// Создаем папки по очереди
		foldersToCreate.forEach(folderName => {
			const folderPath = path.join(rootPath, folderName);
			if (!fs.existsSync(folderPath)) {
				fs.mkdirSync(folderPath, { recursive: true });
			}
		});

		// План файлов и их базовое содержимое
		const filesToCreate = [
			{
				relPath: '.gitignore',
				content: 'build/\n.vscode/\nbin/*.exe\n'
			},
			{
				relPath: 'CMakeLists.txt',
				content: 'cmake_minimum_required(VERSION 3.10)\nproject(MyCProject)\n\nadd_subdirectory(lib)\nadd_subdirectory(bin)\n'
			},
			{
				relPath: path.join('docs', 'README.md'),
				content: '# Документация\n\nОписание вашего C/C++ проекта.'
			},
			{
				relPath: path.join('lib', 'CMakeLists.txt'),
				content: '# Конфигурация для внешних библиотек (lib)\n'
			},
			{
				relPath: path.join('bin', 'CMakeLists.txt'),
				content: 'set(SOURCES main.cpp)\nadd_executable(app ${SOURCES})\n'
			},
			{
				relPath: path.join('bin', 'main.cpp'),
				content: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from AutoBuilder!" << std::endl;\n    return 0;\n}\n'
			}
		];

		// Создаем и заполняем файлы по очереди
		filesToCreate.forEach(fileInfo => {
			const filePath = path.join(rootPath, fileInfo.relPath);
			fs.writeFileSync(filePath, fileInfo.content, 'utf8');
		});

		vscode.window.showInformationMessage('Структура C++ проекта успешно сгенерирована!');
	});

	context.subscriptions.push(buildDisposable);
	context.subscriptions.push(createStructureDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
