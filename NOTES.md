# Prism Cut — Design Notes

1. Why 1280x720 — It is a 16:9 field that scales cleanly to every common monitor and to a 720p recording, and it is big enough that falling shards read clearly while the playfield still fits on a laptop screen. The renderer letterboxes it, so the aspect is always exact.

2. Why fixed timestep — Physics with orbiting blades and collision radii must be deterministic: the same inputs must give the same slices, and a laggy frame must never let a shard tunnel through a blade tip. A fixed step makes the seeded RNG and reproducible screenshot scenes actually mean something, and rendering can interpolate freely on top.

3. Why two blades (one to start, cap of three) — One blade alone makes slicing feel lucky; three from the start makes the orb feel like a passive shredder and removes the risk around it. Starting with one and earning up to three via gold rings gives a visible power curve the player controls by chasing risk.

4. Why wave scaling is linear — Shard speed and spawn interval scale linearly (with a floor on the interval) so difficulty grows predictably and a player can always name the reason they died. Exponential scaling punishes suddenly and reads as unfair in a 3-lives arcade game.

5. Why gold rings are rare — Rings are the only way to add blades, so their scarcity makes each spawn an event that pulls the player off their safe path. A rare, visible, high-value target creates the game's core decision: dash for the ring, or hold position against the shard rain.
