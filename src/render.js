const { desktopCapturer, ipcMain } = require('electron')
const notify = require('electron-notification')
const http = require('http')

let window_select = document.querySelector('select')
let clear_button = document.getElementById('clear_btn')
let screenshot_button = document.getElementById('screenshot_btn')
let monitor_button = document.getElementById('monitor_btn')
let video_elt = document.querySelector('video')
let change_notification = document.getElementById('change_notification')

let monitor_webhook = document.getElementById('monitor_webhook')
let control_section = document.getElementById('control_notification')

let dekstopCaptures
let selectedDesktopCapture = 0
let currentScreenshot = null
let currentlyMonitoring = false
let monitorTimeoutHandler = null

async function getDesktopCaptures() {
    dekstopCaptures = await desktopCapturer.getSources({
        types: ['window', 'screen']
    })
}

async function captureDesktopSources() {
    getDesktopCaptures().then(() => {
        window_select.innerHTML = '<option value=\"0\" hidden>Select a Window</option>'
        dekstopCaptures.forEach(element => {
            if (selectedDesktopCapture == element.id)
                window_select.innerHTML += `<option value="${element.id}" selected>${element.name}</option>`
            else
                window_select.innerHTML += `<option value="${element.id}">${element.name}</option>`
        })
        if (dekstopCaptures.filter(element => element.id == selectedDesktopCapture).length == 0) clearSelect()
    })
    setTimeout(captureDesktopSources, 500)
}

async function onChangeSelect() {
    selectedDesktopCapture = window_select.options[window_select.selectedIndex].value
    clear_button.disabled = false
    screenshot_button.disabled = false
    document.getElementById('no_window_indicator').hidden = true
    screenshot_button.innerHTML = "Take a screenshot"
    monitor_button.disabled = true
    video_elt.hidden = false
    const constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: selectedDesktopCapture
            }
        }
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    video_elt.srcObject = stream
    video_elt.width = 800
    video_elt.height = 600
    video_elt.play()
}

function clearSelect() {
    window_select.selectedIndex = 0
    selectedDesktopCapture = 0
    clear_button.disabled = true
    screenshot_button.disabled = true
    monitor_button.disabled = true
    document.getElementById('no_window_indicator').hidden = false
    video_elt.hidden = true
    video_elt.srcObject = null
    screenshot_button.innerHTML = 'Take a screenshot'
    change_notification.hidden = true
}

function manageScreenshots() {
    if (video_elt.paused) {
        screenshot_button.innerHTML = "Take a screenshot"
        monitor_button.disabled = true
        video_elt.play()
    } else {
        change_notification.hidden = true
        screenshot_button.innerHTML = 'Retake another screenshot'
        monitor_button.disabled = false
        video_elt.pause()
        let canvas = document.createElement('canvas')
        canvas.height = video_elt.height
        canvas.width = video_elt.width
        let ctx = canvas.getContext('2d')
        ctx.drawImage(video_elt, 0, 0)
        currentScreenshot = canvas.toDataURL('image/jpeg', 1.0)
    }
}

function monitorSource() {
    if (currentlyMonitoring) {
        currentlyMonitoring = false
        monitor_button.classList.remove('is-danger')
        monitor_button.classList.add('is-primary')
        monitor_button.innerHTML = 'Start Monitoring'
        window_select.disabled = false
        clear_button.disabled = false
        monitor_button.disabled = true
        screenshot_button.disabled = false
        screenshot_button.innerHTML = 'Take a screenshot'
        window.clearInterval(monitorTimeoutHandler)
        monitorTimeoutHandler = null
        video.play()
    } else {
        currentlyMonitoring = true
        monitor_button.classList.remove('is-primary')
        monitor_button.classList.add('is-danger')
        monitor_button.innerHTML = 'Stop Monitoring'
        window_select.disabled = true
        clear_button.disabled = true
        screenshot_button.disabled = true
        change_notification.hidden = true
        screenshot_button.innerHTML = '<div class=\'loader\'></div>'
        video.play()
        launchMonitoring()
    }
}

function launchMonitoring() {
    let canvas = document.createElement('canvas')
    canvas.height = video_elt.height
    canvas.width = video_elt.width
    let ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    if (canvas.toDataURL('image/jpeg', 1.0) != currentScreenshot) {
        control_section.style.visibility = 'hidden'
        control_section.style.height = '0'
        change_notification.hidden = false
        monitorSource()
        playSuccessAudio()
    } else {
        monitorTimeoutHandler = setTimeout(launchMonitoring, 100)
    }
}

function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i') // fragment locator
    var isCorrect = !!pattern.test(str)
    if (!isCorrect) console.log('Wrong url')
    return !!pattern.test(str)
}

function sendDesktopNotification(title, body) {
    new notify(
        title, {
        body: body,
        icon: 'images/tray.png'
    })
}

function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
        //TODO: do something
    }
}

function sendWebhookNotification(url) {
    var imgBase64 = getScreenshot()
    const options = {
        headers: {
            'id': new Date().getDate(),
            'title': 'From Desktop',
            'body': 'Change has been detected!',
            'image': imgBase64
        }
    }
    http.get(url, options, (resp) => {
        console.log(resp.statusCode)
    }).on("error", (err) => {
        console.log("Error: " + err.message)
    })
}

function getScreenshot() {
    const canvas = document.createElement("canvas")
    canvas.width = video_elt.clientWidth * 1
    canvas.height = video_elt.clientHeight * 1
    canvas.getContext('2d').drawImage(video_elt, 0, 0, canvas.width, canvas.height)

    const image = new Image()
    image.src = canvas.toDataURL()

    return image.src.substring('data:image/png;base64,'.length)
}

function playSuccessAudio() {
    if (validURL(monitor_webhook.value)) sendWebhookNotification(monitor_webhook.value)
    sendDesktopNotification('WCNotifier', `The window has been changed to another state`)
}

window.onload = captureDesktopSources()
window_select.onchange = onChangeSelect
clear_button.onclick = clearSelect
screenshot_button.onclick = manageScreenshots
monitor_button.onclick = monitorSource

document.addEventListener('DOMContentLoaded', () => {
    (document.querySelectorAll('.notification .delete') || []).forEach(($delete) => {
        $notification = $delete.parentNode
        $delete.addEventListener('click', () => {
            control_section.style.visibility = 'visible'
            control_section.style.height = null
            change_notification.hidden = true
        })
    })
})

// demo
console.log(ipcRenderer.sendSync('synchronous-message', 'ping')) // prints "pong"

ipcRenderer.on('asynchronous-reply', (event, arg) => {
    console.log(arg) // prints "pong"
})
ipcRenderer.send('asynchronous-message', 'ping')