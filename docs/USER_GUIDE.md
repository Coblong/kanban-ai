# User Guide

## Getting started

Start the app and open http://localhost:8000. Log in with:

- **Username:** `user`
- **Password:** `password`

## Kanban board

The board has five columns. You can:

- **Rename a column** — click the column title and type a new name
- **Add a card** — click "Add a card" at the bottom of a column, fill in the title and optional details, then click "Add card"
- **Move a card** — drag it to another column or a different position within the same column
- **Remove a card** — click the "Remove" button on the card

## AI Assistant

The AI chat panel is on the right side of the board. Type a message and press **Send** (or **Enter**) to interact with the AI.

The AI can read your board and perform card operations when asked. Cards that the AI creates, moves, or updates are briefly highlighted in yellow so you can spot them.

### Example prompts

**Asking questions:**
- "What's currently in the To Do column?"
- "How many cards are in progress?"
- "Which cards look like they could be done next?"

**Creating cards:**
- "Add a card called 'Fix login bug' to To Do"
- "Create a card in In Progress: 'Write API tests', description 'Cover the board endpoints'"

**Moving cards:**
- "Move 'Fix login bug' to In Progress"
- "Put all Done cards back into To Do"

**Updating cards:**
- "Rename 'Fix login bug' to 'Fix authentication bug'"
- "Add a description to the card about API tests"

**Multiple operations:**
- "Create three cards in Backlog: 'Set up CI', 'Write docs', 'Deploy to staging'"
- "Move everything from Review to Done"

### Tips

- The AI sees your current board every time you send a message — you don't need to describe it
- Conversation history is preserved in the current session (up to 20 messages)
- If the AI makes a mistake, just tell it: "Actually, move that card to Backlog instead"
- The AI will not perform operations unless you explicitly ask — asking questions is always safe

### Known limitations

- Conversation history is in-memory and clears when the server restarts
- The AI may occasionally misidentify a card if multiple cards have similar titles — use IDs if needed ("move card 5 to Done")
- Complex multi-step instructions work best when broken into separate messages
