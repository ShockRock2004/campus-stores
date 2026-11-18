# Campus Stores — Would I keep this product?

**Yes, I would keep it, with one change to how it models a loan.** The desk already stops the wrong equipment from leaving. Where it breaks is the handover: once a kit comes back in pieces, the app can no longer say who has what, so the shift has to write it down in a free-text note. My prototype makes the app hold that information itself, so the next shift reads the answer instead of a note.

**Run it:** open `index.html` in a modern browser (works offline), or serve the folder with `python3 -m http.server 8000 --bind 127.0.0.1` and visit `http://localhost:8000`. A spotlight walkthrough opens at the start of each scene; **Walkthrough** in the sidebar replays it and **Restart sample shift** resets the story.

---

## 1. What the product handles well

### The moment: issuing the Film Society kit at 3:45 pm

When I issued the screening kit, the app refused to let the wrong things out of the door:

- **It blocks equipment the club wasn't approved for.** I picked the digital camera (CA-03) for the Film Society by mistake. The app rejected it: *"This equipment type is outside the approved request."*
- **It enforces the approved quantity.** A second speaker for the same request is refused.
- **Broken stock never reaches the counter.** Projector PR-06 is in the workshop, so it never appears as an option. The only projector I could issue was the working PR-04.

The desk worker doesn't have to remember the approval rules; the product enforces them at the moment of hand-over. That's the right place for the rule to live, and I kept all three checks.

### Other things worth keeping

- **Each physical unit is tracked separately.** This is what makes a partial return possible at all: on Friday night two items could be closed while the adapter stayed open.
- **The register opens on what's outstanding**, not on the full history, so the next shift starts from what needs attention.
- **Confirmations are specific**, e.g. *"Issued AD-15 to Kabir Sen on slip L-404."*
- **It works on a phone** without sideways scrolling.

---

## 2. The moment I would change

### The moment: Friday 7:30 pm, the kit comes back in pieces

Kabir returned the projector and speaker and said Leela had the adapter and would bring it at 9 am. I closed two slips, then had to open the **Desk book** and type a note for the morning shift, because the app had nowhere to record what had just happened:

- the adapter was now with **Leela**, but the slip still said **Kabir**;
- it was now due **Saturday 9 am**, but the slip still said **Fri 8 pm**, and nothing ever flagged it as late;
- no screen said *"Film Society: 2 of 3 back"*.

On Saturday morning, the new worker had to read my note, cross-check the loan register (which shows only "L-404 · AD-15", not "adapter"), and decode the code in Inventory. There are **two adapters in the same bin (C4)**, so closing the wrong one was easy. If I had skipped the note or typed the wrong code, the morning shift would have been lost.

**The note and the records disagreed, and the job depended on a person writing prose correctly at the end of a shift.** The handover should come from the data, not from memory.

### Related problems I found on the same shift

| What I saw | Why it matters |
|---|---|
| Issuing one 3-item kit took **18 clicks and selections**: three separate forms, re-picking the request, person and return time each time | Slow at a counter with a queue and a film starting in 15 minutes |
| The person who **filed** the request (Isha) disappears; only "Collected by: Kabir" is stored | Nobody is accountable once the kit is out |
| "Collected by" lists every student, so the Debate Union's Tara could collect the Film Society kit | No link between the club and who may take its equipment |
| "Return by" isn't filled from the approval, and **Sat noon is accepted** for a kit approved until Fri 8 pm | An approved deadline can be quietly extended |
| The unit list offers everything on the shelf (including the camera); the error only appears after saving | Mistakes are reported instead of prevented |
| Kabir's permission to collect lives in the Desk book; the request itself says *"the host will collect"* | Key information is split across screens |
| **Record return is one click, no confirmation, no undo**, and doesn't record who brought the item back or when | I closed Tara's microphone by accident and the only fix was restarting the shift |
| Time can be moved on with **nothing issued**; Kabir would leave empty-handed | No warning when the job isn't done |
| Errors appear as small grey text in the bottom bar and vanish on the next click | Easy to miss |

---

## 3. My change: one loan per request, and the app owns the handover

### What changed

1. **One loan per request, with a line per item.** A request becomes a single loan (L-402), and each item inside it keeps its own status (out, back, overdue). Partial returns still work, and the request always shows progress, e.g. *"2 of 3 back"*.
2. **Responsibility is separate from custody.** *Responsible: Isha Rao* is filled in from the request automatically. *Collected by: Kabir Sen* is recorded at pickup, and each item records who has it **now** (Leela Das).
3. **A partial return asks the question the note used to answer.** When items stay out, the app asks *"Who has the rest of the Film Society kit, and when is it coming back?"* and saves the answer on the item. The Desk book stays for messages from clubs; **no handover note is needed.**
4. **Hand out the whole kit in one step.** From the request, the app suggests the collector from Isha's message, picks an available unit for each approved item, and takes the due time from the approval. Only approved units on the shelf are offered (PR-06 shows as "in repair" and can't be chosen); only club members can collect. **18 interactions became 2** when the suggested units are right.
5. **Return by item code.** The worker types the code on the label. The app finds the loan, defaults "Brought back by" to whoever has it, and records who returned it and when. Typing the wrong adapter (AD-12) gives: *"AD-12 (USB-C → HDMI adapter) is already on the shelf in bin C4. It isn't on any loan, so check the label."*
6. **Safety nets.** Every hand-out, return and update can be undone. Moving time on warns if the kit is incomplete or if an item is still out with no one recorded as holding it. Items past due are flagged **Overdue**.

### The same job, using the prototype

**Friday 3:45 pm: pickup.** *Today* lists the Film Society under **Pickups waiting**. I click **Hand out**: a panel opens titled *Hand out kit*, with Kabir suggested ("from Isha Rao's message at 3:20 pm") and PR-04, SP-02 and an adapter already matched from the shelf. I confirm. Loan L-402 is created: *"Handed out 3 items to Kabir Sen on loan L-402. Isha Rao stays responsible."* If I had cleared the adapter, the app would warn: *"The kit will leave incomplete. Playback is from a USB-C-only laptop."*

**Friday 7:30 pm: partial return.** In **Returns** I type PR-04 and SP-02 and confirm once. The app asks who has the rest; I choose **Leela Das, expected Sat 9 am**. If I try to move the clock on before answering, it warns that the morning shift won't know who has the adapter.

**Saturday 9:00 am: morning shift.** I've just taken over. *Today → Out right now* shows: **USB-C → HDMI adapter · AD-15 · with Leela Das · due Sat 9 am.** I don't read any notes. Leela hands me an adapter; I type AD-15 from its label. "Brought back by" already says Leela. I confirm: *"Film Society kit complete: everything is back."* The request now shows who returned each item and when.

### What I kept

- The **approval check**, the **quantity check** and **repair units being unavailable**, all now applied before a mistake can be made rather than after.
- **Per-unit tracking**, now grouped inside the loan instead of loose slips.
- **Outstanding-first views**: *Today* opens on pickups waiting, items out and overdue.
- The **Desk book** for messages from clubs, now linked to the request each message is about.
- The **three-scene story and time control**, so the exercise plays the same way.

### One observation at a real counter

**Watch the Saturday-morning worker close Leela's adapter, and note whether they open the Desk book (or ask a colleague) before closing the loan.**

If the change works, they go straight from *Out right now* to typing the code, without reading a note, and close the right adapter. If they still reach for the Desk book, the loan isn't showing enough, and that's what I'd fix next.

---

## 4. Interface changes (short)

- **Plain, task-based navigation:** Today · Requests · Returns · Inventory · Desk book.
- **Request panels:** opening a request (from any list) shows a panel titled for the task (*Hand out kit*, *Out right now*, or the request name), with the clicked item highlighted. The list you came from stays visible behind it.
- **Status at a glance:** consistent chips (*Waiting for pickup*, *Out*, *Partly back*, *Overdue*, *Complete*) and an "x of y back" progress bar on every request.
- **Item name and code always together** (*USB-C → HDMI adapter · AD-15 · Bin C4*), never a bare code.
- **Errors next to the field that caused them**, in red, staying until fixed.
- **A spotlight walkthrough per scene**, replayable from the sidebar; a **Back** link on every screen; **light and dark mode**; works on phone and desktop.

---

## Source

- `index.html`: page layout, navigation and header.
- `app.js`: sample records, loan model, screens and interactions.
- `styles.css`: app-specific styles (forms, status chips, panels, walkthrough).
- `third-party/`: bundled icon library and licence notices.
