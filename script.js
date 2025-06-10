import { hexConstants, terrainColors, playerColors, players, monsters, obstacles } from './config.js';
import { moveMonsters } from './monsterBehaviours.js';

const canvas = document.getElementById("hexMap");
const ctx = canvas.getContext("2d");
let deadPlayers = [];

const { hexSize, hexHeight, hexWidth, vertDist, horizDist } = hexConstants;

let currentPlayerIndex = 0;
let mapData = new Map();
let playerToKill = null;
let playerTurnEnded = false;
let playerMoveHistory = [];

function hexToPixel(q, r) {
    const x = q * horizDist + 50;
    const y = r * vertDist + 50 + (q % 2) * (vertDist / 2);
    return { x, y };
}
function updateTurnIndicator() {
    const player = players[currentPlayerIndex];
    if (!player) return;
    const symbol = playerColors[parseInt(player.id[1]) - 1];
    const indicator = document.getElementById("turnIndicator");
    indicator.textContent = `Tura: ${symbol} (${player.id})`;
    indicator.style.backgroundColor = "#333";
    indicator.style.border = "2px solid white";
    indicator.style.padding = "10px";
    indicator.style.borderRadius = "8px";
    indicator.style.display = "inline-block";
  }
  


function drawHex(x, y, fillColor) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i;
        const dx = hexSize * Math.cos(angle);
        const dy = hexSize * Math.sin(angle);
        if (i === 0) ctx.moveTo(x + dx, y + dy);
        else ctx.lineTo(x + dx, y + dy);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = "#444";
    ctx.stroke();
}

function drawTrail(trail, color, currentPos) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
        const { q, r } = trail[i];
        const { x, y } = hexToPixel(q, r);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    if (trail.length > 0 && currentPos) {
        const last = trail[trail.length - 1];
        const { x: lastX, y: lastY } = hexToPixel(last.q, last.r);
        const { x: curX, y: curY } = hexToPixel(currentPos.q, currentPos.r);

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(curX, curY);
        ctx.stroke();
    }
}


function drawPlayers() {
    for (const player of players) {
        drawTrail(player.trail, "rgba(255,255,255,0.5)", player);
        const { x, y } = hexToPixel(player.q, player.r);
        ctx.font = "36px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.strokeText(playerColors[parseInt(player.id[1]) - 1], x, y);
        ctx.fillText(playerColors[parseInt(player.id[1]) - 1], x, y);
    }
}

function drawMonsters() {
  for (const monster of monsters) {
    const { q, r, id, trail } = monster;
    const { x, y } = hexToPixel(q, r);
    const size = 24;
    const padding = 6;  
    const text = id.toString();
    drawTrail(trail, "rgba(255,0,0,0.5)", { q, r });


    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, size / 2 + padding, 0, 2 * Math.PI);  
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${size}px sans-serif`;
    ctx.fillText(text, x, y);
  }
}

function formatBehaviorName(name) {
 
    return name
      .split('_')  
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))  
      .join(' ');
  }
  

  canvas.addEventListener("contextmenu", (e) => {

    if (!players[currentPlayerIndex]) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
  
    const size = 24;
    const padding = 4;
  
    for (const monster of monsters) {
      const { q, r, id, behaviours } = monster;
      const { x, y } = hexToPixel(q, r);
      const text = id.toString();
      ctx.font = `bold ${size}px sans-serif`;
      const textWidth = ctx.measureText(text).width;
      const boxX = x - textWidth / 2 - padding;
      const boxY = y - size / 2 - padding;
      const boxW = textWidth + 2 * padding;
      const boxH = size + 2 * padding;
  
      if (
        mouseX >= boxX &&
        mouseX <= boxX + boxW &&
        mouseY >= boxY &&
        mouseY <= boxY + boxH
      ) {
 
        const confirmationModal = document.getElementById('confirmationModal');
        const confirmationMessage = document.getElementById('confirmationMessage');
        const confirmationYesButton = document.getElementById('confirmationYesButton');
        const confirmationNoButton = document.getElementById('confirmationNoButton');
  
        confirmationMessage.textContent = `Czy na pewno chcesz usunąć potwora ID: ${id} i zobaczyć jego zachowanie?`;
  

        confirmationModal.style.display = 'flex';
  
        confirmationYesButton.addEventListener('click', () => {
 
          const monsterModal = document.getElementById('monsterModal');
          const monsterBehaviours = document.getElementById('monsterBehaviours');
  
          const behaviorName = formatBehaviorName(monster.behaviors[0]);
          
          monsterBehaviours.textContent = `Zachowanie potwora ${id} : ${behaviorName}`;
          

          monsterModal.style.display = 'flex';
  

          const index = monsters.findIndex(m => m.id === id);
          if (index !== -1) {
            monsters.splice(index, 1);
          }
  

          confirmationModal.style.display = 'none';
  

          drawMap();
        });
  
        confirmationNoButton.addEventListener('click', () => {
          confirmationModal.style.display = 'none';
        });
  
        break;
      }
    }

    for (const player of players) {
        const { q, r, id } = player;
        const { x, y } = hexToPixel(q, r);
        const symbol = playerColors[parseInt(id[1]) - 1];
  
        ctx.font = "36px Arial";
        const textWidth = ctx.measureText(symbol).width;
        const padding = 10;
        const boxX = x - textWidth / 2 - padding;
        const boxY = y - 36 / 2 - padding;
        const boxW = textWidth + 2 * padding;
        const boxH = 36 + 2 * padding;
  
        if (
          mouseX >= boxX &&
          mouseX <= boxX + boxW &&
          mouseY >= boxY &&
          mouseY <= boxY + boxH
        ) {
          const killModal = document.getElementById("playerKillModal");
          const killMessage = document.getElementById("playerKillMessage");
          const yesBtn = document.getElementById("playerKillYesButton");
          const noBtn = document.getElementById("playerKillNoButton");

          playerToKill = player;
          killMessage.textContent = `Czy na pewno chcesz zabić gracza ${symbol} (${id})?`;
          killModal.style.display = "flex";
  
          yesBtn.onclick = () => {
            const index = players.findIndex(p => p.id === id);
            if (index !== -1) {
              const dead = players.splice(index, 1)[0];
              deadPlayers.push(dead);
              addResurrectButton(dead);
              

              if (index < currentPlayerIndex) {
                currentPlayerIndex--;
              }
     
              if (currentPlayerIndex >= players.length) {
                currentPlayerIndex = 0;
              }
          
              drawMap();
              updateTurnIndicator();
            }
            killModal.style.display = "none";
          };
          
  
          noBtn.onclick = () => {
            killModal.style.display = "none";
          };
  
          break;
        }
    }  
  


  });
  
  const modalCloseButton = document.getElementById('modalCloseButton');
  modalCloseButton.addEventListener('click', () => {
    const monsterModal = document.getElementById('monsterModal');
    monsterModal.style.display = 'none';
  });
  
  function addResurrectButton(player) {
    const btn = document.createElement("button");
    const symbol = playerColors[parseInt(player.id[1]) - 1];
    btn.textContent = `Wskrześ gracza ${symbol}`;
  
    btn.style.display = "block";
    btn.style.marginTop = "12px";
    btn.style.marginBottom = "6px";
    btn.style.width = "100%";
    
    btn.onclick = () => {
      resurrectPlayer(player);
      btn.remove();
    };
  
    document.getElementById("resurrectionContainer").appendChild(btn);
  }
  

function drawObstacles() {
    for (const { q, r } of obstacles) {
        const { x, y } = hexToPixel(q, r);
        drawHex(x, y, "#000");
    }
}

function resurrectPlayer(player) {
    const startPositions = {
        p1: { q: 3, r: 1 },
        p2: { q: 32, r: 1 },
        p3: { q: 32, r: 21 },
        p4: { q: 3, r: 21 }
      };
  
    const pos = startPositions[player.id];
    if (!pos) return;
  
    player.q = pos.q;
    player.r = pos.r;
    player.trail = [];
  

    const originalIndex = parseInt(player.id[1]) - 1;
    players.splice(originalIndex, 0, player);
  

    if (originalIndex <= currentPlayerIndex) {
      currentPlayerIndex++;
    }
  
    
    currentPlayerIndex = players.findIndex(p => p.id === player.id);
    playerTurnEnded = false;
  
    deadPlayers = deadPlayers.filter(p => p.id !== player.id);
    drawMap();
    updateTurnIndicator();
  }
  
  

function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let hex of mapData.values()) {

        const color = terrainColors[hex.terrain] || "#999";
        const { x, y } = hexToPixel(hex.q, hex.r);
        drawHex(x, y, color);

        ctx.font = "16px Arial";
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${hex.q+1},${hex.r+1}`, x, y);
    }

    drawObstacles();
    drawPlayers();
    drawMonsters();
}
document.getElementById("playerKillYesButton").onclick = () => {
    if (!playerToKill) return;
  
    const index = players.findIndex(p => p.id === playerToKill.id);
    if (index !== -1) {
      const dead = players.splice(index, 1)[0];
      deadPlayers.push(dead);
      addResurrectButton(dead);
      if (currentPlayerIndex >= players.length) currentPlayerIndex = 0;
      drawMap();
      updateTurnIndicator();
    }
    document.getElementById("playerKillModal").style.display = "none";
    playerToKill = null;
  };
  
  document.getElementById("playerKillNoButton").onclick = () => {
    document.getElementById("playerKillModal").style.display = "none";
    playerToKill = null;
  };
  

function isObstacle(q, r) {
  
    const hex = mapData.get(`${q},${r}`);
    if (!hex) return true; 
    if (hex.terrain === "water") return true;


    if (obstacles.some(o => o.q === q && o.r === r)) return true;

    return false;
}

function isOccupied(q, r) {
    if (players.some(p => p.q === q && p.r === r)) return true;
    if (monsters.some(m => m.q === q && m.r === r)) return true;
    return false;
}

function getHexAtPosition(mouseX, mouseY) {
    for (let hex of mapData.values()) {
        const { x, y } = hexToPixel(hex.q, hex.r);
        const dx = mouseX - x;
        const dy = mouseY - y;
        if (Math.sqrt(dx * dx + dy * dy) < hexSize) {
            return { q: hex.q, r: hex.r, terrain: hex.terrain };
        }
    }
    return null;
}

function advanceTurn() {
    if (players.length === 0) return;
    currentPlayerIndex++;
    if (currentPlayerIndex >= players.length) {
      currentPlayerIndex = 0;
    }
    playerTurnEnded = false;
    updateTurnIndicator();
  }
  


function undoPlayerMove() {
    if (playerMoveHistory.length === 0) return;
    const lastMove = playerMoveHistory.pop();
    const player = players.find(p => p.id === lastMove.id);
    if (player) {
        player.q = lastMove.q;
        player.r = lastMove.r;
        player.trail.pop();
        drawMap();
        playerTurnEnded = false;
        currentPlayerIndex = players.findIndex(p => p.id === lastMove.id);
        updateTurnIndicator();
    }
}

canvas.addEventListener("click", (e) => {
    if (playerTurnEnded) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const hex = getHexAtPosition(mouseX, mouseY);
    if (!hex) return;

    if (isObstacle(hex.q, hex.r) || isOccupied(hex.q, hex.r)) {
        return;
    }

    const player = players[currentPlayerIndex];
    playerMoveHistory.push({ id: player.id, q: player.q, r: player.r });
    player.trail.push({ q: player.q, r: player.r });

    player.q = hex.q;
    player.r = hex.r;

    drawMap();

    playerTurnEnded = true;

    advanceTurn();
});

fetch("src.json")
    .then(res => res.json())
    .then(data => {
        data.forEach(hex => {
            mapData.set(`${hex.q},${hex.r}`, hex);
        });
        drawMap();
    })
    .catch(err => console.error("Błąd wczytywania mapy:", err));

updateTurnIndicator();

document.getElementById("undoMoveButton").addEventListener("click", undoPlayerMove);
document.getElementById("monsterTurnButton").addEventListener("click", () => {
    moveMonsters(monsters, players, mapData, obstacles);
    drawMap();
    updateTurnIndicator();
});
