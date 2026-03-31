from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Hex(BaseModel):
    col: int
    row: int


class PlayerEntity(BaseModel):
    type: Literal["player"] = "player"
    col: int
    row: int
    color: str
    name: str | None = None


class MonsterEntity(BaseModel):
    type: Literal["monster"] = "monster"
    col: int
    row: int
    hp: int
    id: str
    color: str
    speed: int
    trail: list[Hex] = Field(default_factory=list)
    behaviors: list[str]
    recent_positions: list[Hex] = Field(default_factory=list, alias="_recentPositions")
    pumpkin_target: Hex | None = Field(default=None, alias="pumpkinTarget")
    wait_at_pumpkin: bool | None = Field(default=None, alias="waitAtPumpkin")
    traveller_targets: list[Hex] | None = Field(default=None, alias="travellerTargets")
    current_traveller_index: int | None = Field(default=None, alias="currentTravellerIndex")
    current_patrol_index: int | None = Field(default=None, alias="currentPatrolIndex")

    model_config = {"populate_by_name": True}


class ObstacleEntity(BaseModel):
    type: Literal["obstacle"] = "obstacle"
    col: int
    row: int


Entity = PlayerEntity | MonsterEntity | ObstacleEntity


class MovementRecord(BaseModel):
    actorId: str
    actorLabel: str
    color: str
    from_: Hex = Field(alias="from")
    to: Hex

    model_config = {"populate_by_name": True}


class CombatLogEntry(BaseModel):
    id: int
    type: Literal["move", "attack"]
    message: str


class RemovedMonsterInfo(BaseModel):
    id: str
    behavior: str


class TurnIndicator(BaseModel):
    title: str
    subtitle: str


class GameState(BaseModel):
    entitiesData: list[Entity]
    reachable: list[Hex]
    hoveredPath: list[Hex]
    lastPlayerMove: MovementRecord | None = None
    lastMonsterMoves: list[MovementRecord] = Field(default_factory=list)
    phase: Literal["players", "monsters"] = "players"
    movedPlayers: list[str] = Field(default_factory=list)
    currentPlayerColor: str | None = None
    pendingKillPlayer: PlayerEntity | None = None
    pendingRemoveMonster: MonsterEntity | None = None
    lastRemovedMonsterInfo: RemovedMonsterInfo | None = None
    deadPlayers: list[PlayerEntity] = Field(default_factory=list)
    combatLog: list[CombatLogEntry] = Field(default_factory=list)
    nextLogId: int = 1
    history: list[dict] = Field(default_factory=list)
    turnIndicator: TurnIndicator
    canTriggerMonsterTurn: bool = False
    canUndoMove: bool = False
    currentTurnColor: str | None = None


class SessionEnvelope(BaseModel):
    sessionId: str
    state: GameState


class SessionRequest(BaseModel):
    sessionId: str = "default"


class HexRequest(SessionRequest):
    col: int
    row: int


class PlayerColorRequest(SessionRequest):
    color: str


class MonsterIdRequest(SessionRequest):
    id: str
