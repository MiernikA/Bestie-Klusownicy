import React, { useEffect, useRef, useState } from "react";
import type { Monster } from "./types";
import * as fellowship from "./behaviours/fellowship";
import * as patrolArea from "./behaviours/patrolArea";
import * as predator from "./behaviours/predator";
import * as pumpkinLover from "./behaviours/pumpkinLover";
import * as seekFurthest from "./behaviours/seekFurthest";
import * as traveller from "./behaviours/traveller";

const BEHAVIOURS = {
  fellowship,
  patrolArea,
  predator,
  pumpkinLover,
  seekFurthest,
  traveller,
};

defaultSeed();

function defaultSeed() {
  // no-op: placeholder so bundlers include modules
}

function randId() {
  return Math.random().toString(36).slice(2, 9);
}

function makeMonster(
  name: string,
  behaviour: any,
  colour: string,
  x = 100,
  y = 100
): Monster {
  return {
    id: randId(),
    name,
    pos: { x, y },
    vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
    speed: 1.8,
    colour,
    behaviour: behaviour.behaviour,
  };
}

export default function App() {
  const [monsters, setMonsters] = useState<Monster[]>(() => [
    makeMonster("Fluffy", fellowship, "#f97316", 200, 120),
    makeMonster("Rex", predator, "#ef4444", 400, 180),
    makeMonster("Wander", traveller, "#10b981", 300, 300),
    makeMonster("Patrol", patrolArea, "#60a5fa", 240, 140),
    makeMonster("Pump", pumpkinLover, "#fb923c", 520, 320),
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let last = performance.now();
    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setMonsters((prev) => {
        const next = prev.map((m) => {
          const others = prev.filter((o) => o.id !== m.id);
          const newVel = m.behaviour(m, others);
          const newPos = {
            x: m.pos.x + newVel.x * 60 * dt,
            y: m.pos.y + newVel.y * 60 * dt,
          };
          newPos.x = Math.max(8, Math.min(632, newPos.x));
          newPos.y = Math.max(8, Math.min(472, newPos.y));
          return { ...m, vel: newVel, pos: newPos };
        });
        return next;
      });
      draw();
      rafRef.current = requestAnimationFrame(tick);
    }

    function draw() {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext("2d")!;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.fillStyle = "#071033";
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      for (const m of monsters) {
        ctx.beginPath();
        ctx.fillStyle = m.colour || "#fff";
        ctx.arc(m.pos.x, m.pos.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "11px sans-serif";
        ctx.fillText(m.name, m.pos.x + 12, m.pos.y + 4);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function addRandom() {
    const keys = Object.keys(BEHAVIOURS);
    const k = keys[Math.floor(Math.random() * keys.length)];
    const mod = (BEHAVIOURS as any)[k];
    setMonsters((s) => [
      ...s,
      makeMonster(
        k,
        mod,
        ["#f97316", "#ef4444", "#60a5fa", "#10b981", "#fb923c"][
          Math.floor(Math.random() * 5)
        ],
        100 + Math.random() * 420,
        80 + Math.random() * 320
      ),
    ]);
  }

  function reset() {
    setMonsters([
      makeMonster("Fluffy", fellowship, "#f97316", 200, 120),
      makeMonster("Rex", predator, "#ef4444", 400, 180),
      makeMonster("Wander", traveller, "#10b981", 300, 300),
      makeMonster("Patrol", patrolArea, "#60a5fa", 240, 140),
      makeMonster("Pump", pumpkinLover, "#fb923c", 520, 320),
    ]);
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Bestie — React + TypeScript</h1>
        <div style={{ flex: 1 }} />
        <button className="button" onClick={addRandom}>
          Add Random
        </button>
        <button style={{ marginLeft: 8 }} className="button" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="canvasWrap">
        <canvas ref={canvasRef} width={640} height={480} className="canvas" />
        <div className="controls">
          <h3>Monsters ({monsters.length})</h3>
          <div className="monsterList">
            {monsters.map((m) => (
              <div key={m.id} className="monsterCard">
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <strong>{m.name}</strong>
                  <span style={{ color: m.colour }}>
                    {m.pos.x.toFixed(0)},{m.pos.y.toFixed(0)}
                  </span>
                </div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  {m.name} behaviour
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <small style={{ opacity: 0.8 }}>
          This is a TypeScript + React reimplementation (behaviours are simple
          approximations of original JS files). Replace or refine behaviours in{" "}
          <code>src/behaviours</code> as needed.
        </small>
      </div>
    </div>
  );
}
