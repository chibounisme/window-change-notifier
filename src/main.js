const { app, BrowserWindow, Menu, Tray } = require('electron')
const path = require('path')


let mainWindow
let tray
let appHasBeenMinimized = false;
const contextMenu = Menu.buildFromTemplate([
    { 
        label: 'Show App', click:  function() {
            mainWindow.show()
            tray.destroy()
        } 
    }, { 
        label: 'Quit', click:  function() {
            mainWindow.destroy()
            app.quit()
        }
    }
])
const appIcon = path.join(__dirname, 'images/tray.png')

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 412,
        height: 870,
        webPreferences: {
            nodeIntegration: true
        },
        icon: appIcon,
        maximizable: false,
        resizable: false,
        minWidth: 412,
        minHeight: 870,
    })
    mainWindow.loadFile(path.join(__dirname, 'index.html'))
    //mainWindow.openDevTools();
    mainWindow.on('minimize', function (event) {
        loadTray();
        event.preventDefault()
        mainWindow.hide()
    })
}

function loadTray() {
    tray = new Tray(appIcon)
    tray.setToolTip('Window Changer Notifier')
    tray.setContextMenu(contextMenu)
    if(appHasBeenMinimized == false) {
        appHasBeenMinimized = true;
        tray.displayBalloon({
            title: 'The Application has been minimised!',
            content: 'To quit the application, right click on the tray icon and click on \'Quit\'.'
        })
    }
    tray.on('double-click', function () {
        mainWindow.show()
        tray.destroy()
    })
}

app.whenReady().then(createWindow)
Menu.setApplicationMenu(null)


