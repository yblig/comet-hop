# Comet Hop — design
Interpretation: "a very good game in your opinion" → an original one-thumb arcade game that is
instantly readable, has real skill depth (aiming, timing, PERFECT combos), escalates through
named space sectors, and has a reason to come back (best score, stardust currency, comet skins).

## Pitch
You are a tiny, cheerful comet. Circle a sleepy planet, tap to fling yourself off on the tangent,
and glide into the next planet's gravity ring. Graze the ring's edge for PERFECT combos, grab
stardust, dodge asteroids and black holes, and climb as far into the cosmos as you can.

## Core loop (every 1–3 s)
Orbit → read the angle → TAP → fly in a straight line → captured by a ring (or lost) → orbit again.
Orbits decay (ring timer), so you can't wait forever. Satisfying because the aim is fully skill
based, captures snap with a pop, and PERFECT chains raise a score multiplier with rising pitch.

## Screens & flow
Boot → Preload (styled loading bar) → Title → (first run: How to play) → Game ⇄ Pause → Results → Title
Skins (shop) and Settings reachable from Title; Settings also from Pause; How-to from Title "?".
Back button: Title = press twice to exit · Game = pause · Pause = resume · Results = Title ·
Skins/Settings/How-to = close.

## Mechanics
- Comet orbits the current planet at orbit radius `ro = body + 75` with linear speed v_orbit.
- Tap anywhere: comet launches along the tangent at v_fly. A short dotted aim guide shows the
  tangent (toggle in Settings).
- Entering any other planet's ring (distance ≤ ro) captures the comet; it keeps its direction of
  travel (clockwise/anticlockwise from the cross product).
- PERFECT: impact parameter |b| ≥ 0.55·ro (grazing the ring rather than diving at the core).
  PERFECT → combo +1; normal capture → combo 0. Points per new planet = 10 × min(5, 1+combo).
- Stardust ✦: +5 points and +1 currency. Placed in arcs between planets and as rings around
  ringed planets.
- Orbit decay: a timer arc on the ring; below 35% the planet looks scared, ring blinks red, ticks
  play. At 0 the comet spirals in → crash. The first planet doesn't decay until the first launch.
- Death: crash into decayed planet, asteroid hit, swallowed by black hole horizon, or flying
  out of the screen (lost in space). Black holes bend your flight path with gravity.
- Power-ups (on orbit rings / gaps): Shield (absorbs one asteroid hit), Magnet (10 s, pulls dust).
- Continue: once per run for 50 ✦ — respawn orbiting the last planet with a shield.

## Progression & difficulty (h = planets hopped)
| Sector | from h | name | new thing |
|---|---|---|---|
| 1 | 0 | Moon Orchard | static planets, 7 s decay |
| 2 | 10 | Nebula Drift | moving planets, dust trails |
| 3 | 25 | Asteroid Alley | drifting asteroids |
| 4 | 45 | Black Hole Bay | black holes bend your path |
| 5 | 70 | Nova Fields | everything, faster |
| 6+ | +30 each | Deep Space N | endless, cycling palettes |
- gap Y: 430 + min(150, 3h) ± 60 · decay: max(3.0, 7 − 0.04h) s
- v_orbit: 470 + min(260, 4h) · v_fly: 1150 + min(260, 4h)
- moving planets from h ≥ 10 (35% → 55%), asteroids from h ≥ 25, black holes from h ≥ 45
- First 30 s: wide rings, slow orbits, no hazards — impossible to fail by accident except by
  flying off-screen.

## Art direction
Palette "Cosmic Candy": bg #0b0a24 · surface #1d1650 · primary cyan #3ff0ff · magenta #ff4fd8 ·
accent yellow #ffd84f · danger #ff3b5c · text #f2f0ff · outline #140f33.
Style: chunky cartoon vector, 10 px dark outline (#140f33), top-left light, radial gradients,
white highlight ellipses, cute faces on planets (sleep / happy / scared) and on the comet.
Glows via additive soft particles. Font: Fredoka (600/700).
Assets (art/build.mjs → public/art): 6 planets, 2 ringed planets, 3 planet faces, 8 comet heads,
3 asteroids, black hole + swirl, stardust, shield & magnet badges, shield bubble, 3 nebula
clouds, buttons (yellow/cyan/pink + round), icons (pause, play, home, retry, gear, music,
sound, vibrate, comet, help, close, lock, aim, check, star). Stars are canvas-generated tiles.

## Audio (scripts/audio, spec in audio/sfx.json)
Music: title = chill, 16 bars, seed 7 · game = upbeat 124 bpm, 16 bars, seed 11.
SFX: ui_tap, ui_open, ui_back, toggle, launch, capture, perfect, dust, combo, powerup,
shield_break, tick, crash, swallow, lost, gameover, sector, newbest, unlock, buy, error.

## Juice
Launch: comet stretch + whoosh + spark burst. Capture: planet squash, ring flash, pop, face wakes up.
PERFECT: floating "PERFECT ×n" text with rising pitch, ring shockwave. Dust: sparkle burst +
pitch rising along a chain. Death: explosion particles, screen shake, white flash, slow-mo.
Sector change: banner slides in, background colors crossfade. Score pulses on change.
Title: comet orbiting a big sleepy planet, logo bobbing, Play pulsing, drifting nebula.
Results: score count-up, NEW BEST stamp + confetti.

## Save data
best, dust, ownedSkins, skin, stats {games, hops, bestSector}, aimGuide, howtoSeen,
audioSettings (lib), haptics (lib). saveVersion = 1.
