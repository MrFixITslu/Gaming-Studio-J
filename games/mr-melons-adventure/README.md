# Mr. Melon's Adventure

A complete, self-contained browser game based on the original game idea.

## Play immediately
1. Open `index.html` in Chrome, Edge, Firefox, or Safari.
2. Enter a nickname.
3. Enter the default friend code: `MELONCREW`.
4. Play.

No installation, account, ads, tracking, or internet connection is required.

## Controls
- Left / Right arrows or A / D: Move
- Space / Up / W: Jump / swim upward
- X: Seed Shot
- F: Melon Freeze
- P: Pause
- On phones/tablets, touch controls appear automatically.

## Included
- 4 complete platforming levels
- Mr. Melon character
- Melon Freeze ability
- Seed Shot attack
- Math quiz encounters
- Armour and upgrades
- Water Map
- Aggressive chasing fish
- Water Bottle quest item
- Water Bottle exchange for Nova Melon or Super Freeze
- Achievement popups with icons
- Shop
- Final boss
- Local save system
- Friend-code gate
- Local crew high-score board
- Mobile controls
- Procedural sound effects
- No external assets or dependencies

## Change the private friend code
Open `index.html` in a text editor and find:

`const FRIEND_CODE="MELONCREW";`

Replace `MELONCREW` with your preferred code.

## Important note about "friends only"
This edition is intentionally serverless so it can be played immediately. The friend code is a family/private gate, not strong internet security because the whole game runs in the browser. For true private online accounts or real-time multiplayer, the next version would need a small server/backend.

## Share with friends
You can:
- Copy this folder to another computer, or
- Upload the folder to any static web host, or
- Host it on your own web server.

Each browser/device keeps its own save and local crew leaderboard.


## Enhanced Edition additions
- Jump on an enemy's head to defeat it instantly (Captain Rind takes stomp damage instead).
- Stomp-combo scoring with escalating rewards.
- Ground Pound: Down Arrow / S in mid-air.
- Mid-level checkpoints and checkpoint respawning.
- One hidden Golden Seed in each level, with a completion bonus for finding all four.
- More responsive enemy behaviour.
- Three-phase Captain Rind boss battle with increasingly aggressive attacks.
- Frozen enemies grant bonus points when defeated.
- Updated touch controls and HUD.


## Version 2 upgrades
- Mission panel no longer blocks gameplay. It auto-collapses and can be toggled with `Q`.
- More detailed semi-realistic cartoon art for Mr. Melon and enemies.
- Melon Village hub with replayable world portals.
- Character Hut with hero selection and unlockable characters.
- Character-specific abilities for Nova, Aqua, and Royal Melon.
