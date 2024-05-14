const canvas = document.getElementById('drawing-area')
const ctx = canvas.getContext('2d')
const cursorArea = document.getElementById('cursor-area').getContext('2d')
const colorInput = document.getElementById('color')
const cursorSizeSelector = document.getElementById('cursor-size')
const colorMemoryDiv = document.getElementById('color-memory')
const replayButton = document.getElementById('replay')
const undoButton = document.getElementById('undo')
const redoButton = document.getElementById('redo')
const download = document.getElementById('download')
const colorMemory = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#808080', '#800000']
const drawingActions = []
const redoActions = []
let drawing = false
let cursorSize = 30

function updateReplayButton () {
  replayButton.style.display = drawingActions.length ? 'inline-block' : 'none'
}

// Function to start drawing
function startDrawing (e) {
  drawing = true
  drawingActions.push({
    action: 'start',
    x: e.clientX - canvas.offsetLeft,
    y: e.clientY - canvas.offsetTop,
    color: ctx.strokeStyle,
    size: ctx.lineWidth
  })
  draw(e)
  updateReplayButton()
}

// Function to stop drawing
function stopDrawing () {
  drawing = false
  ctx.beginPath()
  drawingActions.push({ action: 'stop' })
  updateReplayButton()
  redoActions.length = 0
}

// Function to draw on the canvas
function draw (e) {
  if (!drawing) return
  ctx.lineCap = 'round'
  ctx.lineWidth = cursorSize

  ctx.lineTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop)

  drawingActions.push({
    action: 'draw',
    x: e.clientX - canvas.offsetLeft,
    y: e.clientY - canvas.offsetTop,
    color: ctx.strokeStyle,
    size: ctx.lineWidth
  })
}

// Add the event listeners
canvas.addEventListener('mousedown', startDrawing)
canvas.addEventListener('mouseup', stopDrawing)
canvas.addEventListener('mousemove', draw)

const colorHandler = function () {
  ctx.strokeStyle = this.value
  cursorArea.strokeStyle = this.value
  cursorArea.fillStyle = this.value
  colorInput.value = this.value

  // Remove the color from its current position in the memory
  const index = colorMemory.indexOf(this.value)
  if (index > -1) {
    colorMemory.splice(index, 1)
  }

  // Add the color to the start of the memory
  colorMemory.unshift(this.value)

  // If the memory is full, remove the oldest color
  if (colorMemory.length > 10) {
    colorMemory.pop()
  }

  // Update the color memory buttons
  colorMemoryDiv.innerHTML = ''
  colorMemory.forEach(color => {
    const button = document.createElement('button')
    button.value = color
    button.style.backgroundColor = color
    button.addEventListener('click', colorHandler)
    colorMemoryDiv.appendChild(button)
  })
}

colorInput.addEventListener('click', colorHandler)
colorInput.addEventListener('change', colorHandler)

// Update the color memory buttons
colorMemoryDiv.innerHTML = ''
colorMemory.forEach(color => {
  const button = document.createElement('button')
  button.value = color
  button.style.backgroundColor = color
  button.addEventListener('click', colorHandler)
  colorMemoryDiv.appendChild(button)
})

cursorSizeSelector.addEventListener('change', function () {
  cursorSize = this.value
})

function getComplementaryColor(color) {
  // Convert hex to RGB
  let r = parseInt(color.slice(1, 3), 16)
  let g = parseInt(color.slice(3, 5), 16)
  let b = parseInt(color.slice(5, 7), 16)

  // Calculate the complementary color
  r = 255 - r
  g = 255 - g
  b = 255 - b

  // Convert RGB to hex
  r = r.toString(16).padStart(2, '0')
  g = g.toString(16).padStart(2, '0')
  b = b.toString(16).padStart(2, '0')

  return '#' + r + g + b
}

// Function to draw the cursor
function drawCursor (x, y) {
  cursorArea.clearRect(0, 0, cursorArea.canvas.width, cursorArea.canvas.height)
  cursorArea.strokeStyle = getComplementaryColor(ctx.strokeStyle)
  cursorArea.beginPath()
  cursorArea.arc(x, y, cursorSize / 2, 0, Math.PI * 2, true)
  cursorArea.stroke()
  cursorArea.fill()
  cursorArea.closePath()
}

// Update the cursor when the mouse moves
canvas.addEventListener('mousemove', function (e) {
  const x = e.clientX - canvas.offsetLeft
  const y = e.clientY - canvas.offsetTop
  drawCursor(x, y)
})

const drawAllSteps = () => {
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.beginPath()
  drawingActions.forEach(action => {
    ctx.strokeStyle = action.color
    ctx.lineWidth = action.size

    if (action.action === 'start' || action.action === 'draw') {
      ctx.lineTo(action.x, action.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(action.x, action.y)
    } else if (action.action === 'stop') {
      ctx.beginPath()
    }
  })

}

function replayDrawingActions (instant = false) {
  let i = 0
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.beginPath()

  if (instant) return drawAllSteps()

  function drawStep () {
    const action = drawingActions[i]
    if (!action) return
    ctx.strokeStyle = action.color
    ctx.lineWidth = action.size

    if (action.action === 'start' || action.action === 'draw') {
      ctx.lineTo(action.x, action.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(action.x, action.y)
    } else if (action.action === 'stop') {
      ctx.beginPath()
    }

    i++
    if (i < drawingActions.length) {
      setTimeout(drawStep, 1)
    }
  }

  drawStep()
}
replayButton.addEventListener('click', () => replayDrawingActions())

undoButton.addEventListener('click', function () {
  let lastPointer = null
  let firstPointer = null
  for (let i = drawingActions.length - 1; i >= 0; i--) {
    if (drawingActions[i].action === 'stop') {
      lastPointer = i
      continue
    } else if (drawingActions[i].action === 'start') {
      firstPointer = i
      break
    }
  }
  const lastAction = drawingActions.splice(firstPointer, lastPointer - firstPointer + 1)
  redoActions.push(lastAction)
  replayDrawingActions(true)
  updateReplayButton()
})

redoButton.addEventListener('click', function () {
  const lastAction = redoActions.pop()
  if (lastAction) {
    drawingActions.push(...lastAction)
    replayDrawingActions(true)
    updateReplayButton()
  }
})

download.addEventListener('click', function () {
  const image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream")
  const link = document.createElement('a')
  link.href = image
  link.download = 'drawing.png'
  link.click()
  console.log('here')
})

updateReplayButton()
replayDrawingActions(true)
