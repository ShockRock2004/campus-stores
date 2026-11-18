(() => {
  const storageKey = "campus-stores.shift.v2";
  const root = document.getElementById("campus-stores");
  const q = (selector) => root.querySelector(selector);

  /* ---------- Sample records ---------- */
  const requests = [
    {
      id: "RQ-214",
      club: "Film Society",
      event: "Courtyard screening",
      owner: "Isha Rao",
      due: "Fri 8 pm",
      items: ["HDMI projector", "Portable speaker", "USB-C → HDMI adapter"],
      note: "Playback is from a USB-C-only laptop. The host will collect at 4 pm.",
    },
    {
      id: "RQ-209",
      club: "Debate Union",
      event: "Finals rehearsal",
      owner: "Tara Shah",
      due: "Sat 10 am",
      items: ["Wireless microphone"],
      note: "Rehearsal runs into the evening.",
    },
    {
      id: "RQ-217",
      club: "Photo Circle",
      event: "Street portrait walk",
      owner: "Dev Menon",
      due: "Sat noon",
      items: ["Digital camera"],
      note: "Collection on Saturday morning.",
    },
  ];
  const assets = [
    { id: "PR-04", type: "HDMI projector", model: "BenQ MH550", bin: "A2" },
    { id: "PR-06", type: "HDMI projector", model: "Epson EB-X49", bin: "Workshop", repair: true },
    { id: "SP-02", type: "Portable speaker", model: "JBL Eon One", bin: "B1" },
    { id: "SP-05", type: "Portable speaker", model: "Bose S1", bin: "B2" },
    { id: "AD-12", type: "USB-C → HDMI adapter", model: "Belkin AVC002", bin: "C4" },
    { id: "AD-15", type: "USB-C → HDMI adapter", model: "Anker A8312", bin: "C4" },
    { id: "MI-09", type: "Wireless microphone", model: "Shure BLX", bin: "B3" },
    { id: "CA-03", type: "Digital camera", model: "Sony A6400", bin: "D2" },
  ];
  // Club members: only they can collect or hold a club's equipment.
  const people = {
    "Isha Rao": "Film Society",
    "Kabir Sen": "Film Society",
    "Leela Das": "Film Society",
    "Tara Shah": "Debate Union",
    "Dev Menon": "Photo Circle",
  };
  const messages = [
    {
      phase: 0,
      time: "Friday · 3:20 pm",
      from: "Isha Rao",
      req: "RQ-214",
      text: "Kabir Sen is picking up our whole screening kit. Please issue it in his name. I’m setting up in the courtyard.",
    },
    {
      phase: 0,
      time: "Friday · 3:30 pm",
      from: "Tara Shah",
      req: "RQ-209",
      text: "Our microphone stays with me overnight. I’ll return it by 10 am Saturday.",
    },
    {
      phase: 1,
      time: "Friday · 7:30 pm",
      from: "Kabir Sen",
      req: "RQ-214",
      text: "I brought the projector and speaker. Leela Das has our adapter. She’ll be at the counter at 9 am tomorrow.",
    },
  ];
  const shifts = [
    {
      time: "Friday · 3:45 pm",
      short: "Fri 3:45 pm",
      now: 945,
      title: "Pickup at the counter",
      text: "Kabir is here for the Film Society screening. The film starts at four. Can he leave with everything he needs?",
      next: "Move to return time",
    },
    {
      time: "Friday · 7:30 pm",
      short: "Fri 7:30 pm",
      now: 1170,
      title: "The kit comes back in pieces",
      text: "Kabir has brought back the projector and speaker. “Leela still has the adapter. She’ll drop it off tomorrow at nine.” Take the return and hand over to the morning shift.",
      next: "Move to next morning",
    },
    {
      time: "Saturday · 9:00 am",
      short: "Sat 9:00 am",
      now: 1980,
      title: "Morning shift",
      text: "You’ve just taken over. Leela walks in with an adapter. Work out what was outstanding from the screening and close the loan for the right item.",
    },
  ];
  // Minutes from Friday 00:00, so times can be compared.
  const dueAt = { "Fri 8 pm": 1200, "Sat 9 am": 1980, "Sat 10 am": 2040, "Sat noon": 2160 };
  const tabs = ["Today", "Requests", "Take back", "Inventory", "Desk book", "Candidate brief"];

  const original = () => ({
    version: 2,
    tab: "Today",
    phase: 0,
    selected: "",
    issuing: false,
    draft: null,
    warned: false,
    editLine: "",
    basket: [],
    returnedBy: "",
    followUp: [],
    filter: "All items",
    confirmAdvance: false,
    loans: [
      {
        num: 401,
        req: "RQ-209",
        collectedBy: "Tara Shah",
        issuedAt: "Fri 3:30 pm",
        lines: [{ asset: "MI-09", back: false, holder: "Tara Shah", expected: "", returnedAt: "", returnedBy: "" }],
      },
    ],
    notice: "Sample shift · All records are fictional.",
    undo: null,
    error: null,
    focus: "",
  });
  let s = original();

  /* ---------- Lookups ---------- */
  const getAsset = (id) => assets.find((x) => x.id === id);
  const getReq = (id) => requests.find((x) => x.id === id);
  const loanFor = (reqId) => s.loans.find((l) => l.req === reqId);
  const getLoan = (num) => s.loans.find((l) => l.num === num);
  const now = () => shifts[s.phase].now;
  const members = (club) => Object.keys(people).filter((p) => people[p] === club);
  const openLine = (assetId) => {
    for (const loan of s.loans)
      for (const line of loan.lines) if (line.asset === assetId && !line.back) return { loan, line };
    return null;
  };
  const openLines = () =>
    s.loans.flatMap((loan) => loan.lines.filter((l) => !l.back).map((line) => ({ loan, line })));
  const dueOf = (loan, line) => line.expected || getReq(loan.req).due;
  const isLate = (loan, line) => !line.back && now() > dueAt[dueOf(loan, line)];
  const missingItems = (r, loan) => {
    const pool = [...r.items];
    for (const line of loan ? loan.lines : []) {
      const i = pool.indexOf(getAsset(line.asset).type);
      if (i >= 0) pool.splice(i, 1);
    }
    return pool;
  };
  const status = (a) => (a.repair ? "In repair" : openLine(a.id) ? "On loan" : "On shelf");
  const progress = (r) => {
    const loan = loanFor(r.id);
    if (!loan) return { label: "Waiting for pickup", kind: "neutral", text: "Not handed out yet", ratio: 0 };
    const total = loan.lines.length;
    const back = loan.lines.filter((l) => l.back).length;
    const missing = missingItems(r, loan).length;
    const late = loan.lines.some((l) => isLate(loan, l));
    let text = back + " of " + total + " back";
    if (missing) text += " · " + missing + " never handed out";
    if (back === total)
      return { label: missing ? "Closed · incomplete" : "Complete", kind: missing ? "danger" : "good", text, ratio: 1 };
    return { label: late ? "Overdue" : back ? "Partly back" : "Out", kind: late ? "danger" : "info", text, ratio: back / total };
  };

  /* ---------- Markup helpers ---------- */
  const esc = (x) =>
    String(x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const icon = (name) => '<i data-lucide="' + name + '"></i>';
  const card = (inner, kind = "ion-box") =>
    '<div class="' + kind + '"><div class="ion-box__inner" data-glow><div class="ion-box__mask"></div><div class="ion-box__content">' +
    inner +
    '</div><div class="ion-box__spot"></div><div class="ion-box__rim"></div></div></div>';
  const btn = (label, action, val = "", style = "ghost", extra = "") =>
    '<button type="button" class="ion-btn ion-btn--sm ion-btn--' + style + '" data-action="' + action + '" data-val="' +
    esc(val) + '"' + extra + ">" + label + "</button>";
  const chip = (label, kind = "neutral") => '<span class="cs-chip cs-chip--' + kind + '">' + esc(label) + "</span>";
  const itemName = (a) =>
    '<span class="cs-item"><strong>' + esc(a.type) + '</strong><small><span class="cs-code">' + esc(a.id) + "</span> · Bin " + esc(a.bin) + "</small></span>";
  const head = (title, sub, control = "") =>
    '<div class="cs-head"><div><h2 class="t-h4">' + title + "</h2>" + (sub ? '<p class="t-muted">' + sub + "</p>" : "") + "</div>" + control + "</div>";
  const boxHead = (title, sub = "", control = "") =>
    '<div class="cs-boxhead"><div><h3 class="ion-box__title">' + title + "</h3>" + (sub ? '<p class="ion-box__text">' + sub + "</p>" : "") + "</div>" + control + "</div>";
  const table = (cols, headers, rows, empty) =>
    rows.length
      ? '<div class="cs-table"><table class="ion-table" style="--cs-cols:' + cols + '"><thead><tr>' +
        headers.map((h) => "<th>" + h + "</th>").join("") + "</tr></thead><tbody>" +
        rows.map((r) => "<tr>" + r.map((c, i) => '<td data-label="' + esc(headers[i]) + '">' + c + "</td>").join("") + "</tr>").join("") +
        "</tbody></table></div>"
      : '<p class="cs-empty">' + icon("circle-check") + empty + "</p>";
  const select = (name, label, options, value, placeholder = "") =>
    '<label class="cs-field"><span class="ion-field-label">' + label + '</span><span class="cs-selectwrap"><select class="cs-input" name="' + name + '">' +
    (placeholder ? '<option value="">' + placeholder + "</option>" : "") +
    options.map(([v, t, off]) => '<option value="' + esc(v) + '"' + (v === value ? " selected" : "") + (off ? " disabled" : "") + ">" + esc(t) + "</option>").join("") +
    "</select>" + icon("chevron-down") + "</span></label>";
  const errorFor = (at) => (s.error && s.error.at === at ? '<p class="cs-error" role="alert">' + icon("circle-alert") + "<span>" + esc(s.error.text) + "</span></p>" : "");
  const progressBar = (p) => '<span class="cs-bar" aria-hidden="true"><span style="width:' + Math.round(p.ratio * 100) + '%"></span></span>';
  const reqLink = (r) => btn(esc(r.event) + " " + icon("arrow-right"), "open-req", r.id, "ghost", ' aria-label="Open ' + esc(r.event) + '"');

  /* ---------- Story card (top of every screen) ---------- */
  function advanceWarning() {
    const r = getReq("RQ-214"), loan = loanFor(r.id);
    if (s.phase === 0) {
      const missing = missingItems(r, loan);
      if (!loan) return "The Film Society kit hasn’t been handed out yet. Kabir would leave with nothing.";
      if (missing.length) return "Kabir would leave without: " + missing.join(", ") + ". " + r.note.split(".")[0] + ".";
    }
    if (s.phase === 1 && loan) {
      const unknown = loan.lines.filter((l) => !l.back && !l.expected);
      if (unknown.length)
        return unknown.map((l) => getAsset(l.asset).type).join(", ") + " still out with no expected return time. The morning shift won’t know who has it.";
    }
    return "";
  }
  function storyCard() {
    const sh = shifts[s.phase];
    let actions = "";
    if (sh.next && s.confirmAdvance)
      actions =
        '<div class="cs-warn">' + icon("triangle-alert") + "<p>" + esc(s.confirmAdvance) + "</p></div>" +
        '<div class="cs-actions">' + btn("Stay and fix it", "stay", "", "primary") + btn("Move on anyway", "advance", "force") + "</div>";
    else if (sh.next) actions = '<div class="cs-actions">' + btn(esc(sh.next) + " " + icon("arrow-right"), "advance", "", "primary") + "</div>";
    else actions = '<p class="ion-box__text">End of the story. Use <b>Restart sample shift</b> in the sidebar to play again.</p>';
    return card(
      '<div class="cs-story"><div><span class="t-label t-muted">' + esc(sh.time) + " · Scene " + (s.phase + 1) + " of 3</span>" +
        '<h3 class="ion-box__title">' + esc(sh.title) + '</h3><p class="cs-story__text">' + esc(sh.text) + "</p></div>" + actions + "</div>"
    );
  }

  /* ---------- Today ---------- */
  function today() {
    const out = openLines().sort((a, b) => isLate(b.loan, b.line) - isLate(a.loan, a.line) || dueAt[dueOf(a.loan, a.line)] - dueAt[dueOf(b.loan, b.line)]);
    const late = out.filter((o) => isLate(o.loan, o.line)).length;
    const waiting = requests.filter((r) => !loanFor(r.id));
    const stat = (n, label, kind = "") => '<div class="cs-stat"><div class="ion-stat' + (kind ? " cs-stat--" + kind : "") + '">' + n + '</div><span class="t-label t-muted">' + label + "</span></div>";
    let html = head("Today at the <span class=\"ion-accent\">counter</span>", "Everything that needs attention, in one place.");
    html += card('<div class="cs-stats">' + stat(waiting.length, "Pickups waiting") + stat(out.length, "Items out") + stat(late, "Overdue", late ? "danger" : "") + "</div>", "ion-panel");
    html += card(
      boxHead("Pickups waiting", "Approved requests that haven’t been handed out.") +
        table("2fr 1.4fr 1fr 1.2fr", ["Request", "Club", "Return by", ""],
          waiting.map((r) => ["<strong>" + esc(r.event) + '</strong><small class="cs-sub">' + r.id + "</small>", esc(r.club), esc(r.due), btn("Hand out " + icon("arrow-right"), "open-req", r.id, "primary")]),
          "No pickups waiting."),
      "ion-panel"
    );
    html += card(
      boxHead("Out right now", "Who has each item and when it’s due back. Overdue items first.") +
        table("2fr 1.6fr 1.2fr 1fr", ["Item", "Request", "With", "Due back"],
          out.map(({ loan, line }) => {
            const r = getReq(loan.req);
            return [itemName(getAsset(line.asset)), reqLink(r), esc(line.holder), esc(dueOf(loan, line)) + (isLate(loan, line) ? " " + chip("Overdue", "danger") : "")];
          }),
          "Everything is back on the shelf."),
      "ion-panel"
    );
    return html;
  }

  /* ---------- Requests ---------- */
  function requestList() {
    let html = head("Approved <span class=\"ion-accent\">requests</span>", "From the Student Activities Office. Open one to hand out its kit or see what’s still out.");
    html += card(
      table("2fr 1.3fr 1.2fr 1fr 1.8fr 0.9fr", ["Request", "Club", "Responsible", "Return by", "Status", ""],
        requests.map((r) => {
          const p = progress(r);
          return [
            "<strong>" + esc(r.event) + '</strong><small class="cs-sub">' + r.id + "</small>",
            esc(r.club), esc(r.owner), esc(r.due),
            chip(p.label, p.kind) + '<small class="cs-sub">' + esc(p.text) + "</small>" + progressBar(p),
            btn("Open", "open-req", r.id),
          ];
        }), ""),
      "ion-panel"
    );
    return html;
  }

  function holderForm(loan, lines, kind) {
    const r = getReq(loan.req);
    const times = Object.keys(dueAt).filter((d) => dueAt[d] > now());
    return (
      '<form class="cs-holder" data-holder="' + kind + '" data-loan="' + loan.num + '">' +
      lines.map((line) => {
        const a = getAsset(line.asset), current = dueOf(loan, line);
        return '<div class="cs-holder__row">' + itemName(a) + '<div class="cs-form">' +
          select("holder-" + a.id, "Now with", members(r.club).map((p) => [p, p]), line.holder) +
          select("exp-" + a.id, "Expected back", times.map((t) => [t, t]), times.includes(current) ? current : "", "Choose a time…") +
          "</div></div>";
      }).join("") +
      errorFor("holder") +
      '<div class="cs-actions"><button type="submit" class="ion-btn ion-btn--sm ion-btn--primary">Save</button>' +
      btn(kind === "follow" ? "Not now" : "Cancel", kind === "follow" ? "skip-follow" : "cancel-edit") + "</div></form>"
    );
  }

  function issueForm(r) {
    const d = s.draft;
    const suggestion = messages.find((m) => m.req === r.id && m.phase <= s.phase && m.text.includes(d.suggested || "\u0000"));
    let html = boxHead("Hand out kit", "Each approved item is matched to a unit on the shelf. Swap a unit if you pick a different one.");
    html += '<form data-issue><dl class="cs-facts">' +
      "<div><dt>Responsible</dt><dd>" + esc(r.owner) + "<small>Filed the request</small></dd></div>" +
      "<div><dt>Return by</dt><dd>" + esc(r.due) + "<small>Set by the approval</small></dd></div></dl>";
    html += '<div class="cs-form">' + select("who", "Collected by", members(r.club).map((p) => [p, p + (p === r.owner ? " (requester)" : "")]), d.who, "Choose a club member…") + "</div>";
    if (suggestion) html += '<p class="cs-hint">' + icon("message-square") + "<span>Suggested from " + esc(suggestion.from) + "’s message at " + esc(suggestion.time.split(" · ")[1]) + ": “" + esc(suggestion.text) + "”</span></p>";
    html += '<div class="cs-lines">' + r.items.map((type, i) => {
      const units = assets.filter((a) => a.type === type);
      return '<div class="cs-line"><span class="cs-line__type">' + esc(type) + "</span>" +
        select("unit-" + i, "Unit", units.map((a) => {
          const st = status(a);
          return [a.id, a.id + " · " + a.model + " · Bin " + a.bin + (st === "On shelf" ? "" : " (" + st.toLowerCase() + ")"), st !== "On shelf"];
        }), d.units[i], "Not handing this out") + "</div>";
    }).join("") + "</div>";
    const missing = d.units.filter((u) => !u).length;
    html += errorFor("issue") +
      '<div class="cs-actions"><button type="submit" class="ion-btn ion-btn--sm ion-btn--primary">' +
      (s.warned && missing ? "Hand out " + (r.items.length - missing) + " of " + r.items.length + " anyway" : "Hand out kit") + "</button>" +
      btn("Cancel", "cancel-issue") + "</div></form>";
    return html;
  }

  function requestDetail(r) {
    const loan = loanFor(r.id);
    const p = progress(r);
    let html = '<div class="cs-back">' + btn("All requests", "close") + "</div>";
    html += card(
      '<span class="t-label t-muted">' + r.id + " · Approved</span>" +
        boxHead(esc(r.event), esc(r.club), chip(p.label, p.kind)) +
        '<dl class="cs-facts">' +
        "<div><dt>Responsible</dt><dd>" + esc(r.owner) + "<small>Filed the request</small></dd></div>" +
        "<div><dt>Collected by</dt><dd>" + (loan ? esc(loan.collectedBy) + "<small>" + esc(loan.issuedAt) + "</small>" : "—<small>Not handed out yet</small>") + "</dd></div>" +
        "<div><dt>Return by</dt><dd>" + esc(r.due) + "<small>Set by the approval</small></dd></div>" +
        "<div><dt>Progress</dt><dd>" + esc(p.text) + progressBar(p) + "</dd></div></dl>" +
        '<p class="cs-hint">' + icon("info") + "<span>" + esc(r.note) + "</span></p>"
    );
    if (s.issuing && !loan) html += card(issueForm(r), "ion-panel");
    else {
      const used = new Set();
      const rows = r.items.map((type) => {
        const line = loan && loan.lines.find((l) => !used.has(l) && getAsset(l.asset).type === type);
        if (!line) return ['<strong>' + esc(type) + "</strong>", chip("Not handed out"), "—", ""];
        used.add(line);
        const a = getAsset(line.asset);
        if (line.back) return [itemName(a), chip("Back", "good"), "Returned " + esc(line.returnedAt) + " by " + esc(line.returnedBy), ""];
        return [
          itemName(a),
          isLate(loan, line) ? chip("Overdue", "danger") : chip("Out", "info"),
          "With " + esc(line.holder) + " · due " + esc(dueOf(loan, line)),
          btn("Update", "edit-line", a.id),
        ];
      });
      html += card(
        boxHead("Kit", loan ? "Loan L-" + loan.num + " · one loan for the whole request." : "Nothing has left the desk yet.", loan ? "" : btn("Hand out kit " + icon("arrow-right"), "issue", r.id, "primary")) +
          table("2fr 1fr 2.2fr 0.9fr", ["Item", "Status", "Details", ""], rows, "") +
          (s.editLine && loan && loan.lines.some((l) => l.asset === s.editLine && !l.back)
            ? holderForm(loan, loan.lines.filter((l) => l.asset === s.editLine), "edit")
            : ""),
        "ion-panel"
      );
    }
    const related = messages.filter((m) => m.req === r.id && m.phase <= s.phase);
    if (related.length) html += card(boxHead("Messages about this request") + related.slice().reverse().map(message).join(""), "ion-panel");
    return html;
  }

  /* ---------- Take back ---------- */
  function takeBack() {
    let html = head("Take <span class=\"ion-accent\">back</span>", "Type the code printed on each item’s label. The app finds the loan it belongs to.");
    for (const num of s.followUp.slice(0, 1)) {
      const loan = getLoan(num), r = getReq(loan.req);
      const rest = loan.lines.filter((l) => !l.back);
      html += card(
        boxHead(icon("user-round-search") + "Who has the rest of the " + esc(r.club) + " kit?",
          rest.length + " item" + (rest.length > 1 ? "s are" : " is") + " still out. Record who has " + (rest.length > 1 ? "them" : "it") + " and when " + (rest.length > 1 ? "they’re" : "it’s") + " coming back, so the next shift sees it on the loan.") +
          holderForm(loan, rest, "follow"),
        "ion-panel cs-follow"
      );
    }
    let form = '<form class="cs-codeform" data-code><label class="cs-field"><span class="ion-field-label">Item code</span>' +
      '<input class="cs-input cs-input--code" name="code" autocomplete="off" spellcheck="false" placeholder="e.g. PR-04" /></label>' +
      '<button type="submit" class="ion-btn ion-btn--sm ion-btn--ghost">Add item</button></form>' + errorFor("code");
    if (s.basket.length) {
      const holders = new Set(), clubs = new Set();
      for (const code of s.basket) {
        const o = openLine(code);
        holders.add(o.line.holder);
        clubs.add(getReq(o.loan.req).club);
      }
      const options = [...clubs].flatMap(members).map((p) => [p, p]);
      form +=
        table("2fr 1.8fr 1.2fr 0.6fr", ["Item", "Request", "Currently with", ""],
          s.basket.map((code) => {
            const o = openLine(code);
            return [itemName(getAsset(code)), esc(getReq(o.loan.req).event) + '<small class="cs-sub">Responsible: ' + esc(getReq(o.loan.req).owner) + "</small>", esc(o.line.holder),
              '<button type="button" class="ion-icon-btn" data-action="remove-code" data-val="' + code + '" aria-label="Remove ' + code + '">' + icon("x") + "</button>"];
          }), "") +
        '<form data-confirm-return class="cs-confirm"><div class="cs-form">' +
        select("returnedBy", "Brought back by", options, s.returnedBy || [...holders][0]) + "</div>" + errorFor("return") +
        '<div class="cs-actions"><button type="submit" class="ion-btn ion-btn--sm ion-btn--primary">Confirm return of ' + s.basket.length + " item" + (s.basket.length > 1 ? "s" : "") + "</button></div></form>";
    }
    html += card(boxHead("Items being returned", s.basket.length ? "" : "Add each item the person hands you, then confirm once.") + form, "ion-panel");
    html += card(
      boxHead("Out right now") +
        table("2fr 1.8fr 1.2fr 1fr", ["Item", "Request", "With", "Due back"],
          openLines().map(({ loan, line }) => [itemName(getAsset(line.asset)), esc(getReq(loan.req).event), esc(line.holder), esc(dueOf(loan, line)) + (isLate(loan, line) ? " " + chip("Overdue", "danger") : "")]),
          "Everything is back on the shelf."),
      "ion-panel"
    );
    return html;
  }

  /* ---------- Inventory ---------- */
  function inventory() {
    const filters = ["All items", "On shelf", "On loan", "In repair"];
    const seg = '<div class="ion-segmented" data-segmented data-name="filter" role="group" aria-label="Show">' +
      filters.map((f) => '<button class="ion-segmented__item" type="button" data-value="' + f + '" aria-pressed="' + (s.filter === f) + '">' + f + "</button>").join("") + "</div>";
    const rows = assets.filter((a) => s.filter === "All items" || status(a) === s.filter).map((a) => {
      const st = status(a), o = openLine(a.id);
      return [itemName(a), esc(a.model), chip(st, st === "On shelf" ? "good" : st === "In repair" ? "danger" : "info"),
        o ? "With " + esc(o.line.holder) + " · " + esc(getReq(o.loan.req).event) : st === "In repair" ? "Workshop" : "Bin " + esc(a.bin)];
    });
    return head("Inventory", "Every physical unit and where it is right now.") + card('<div class="cs-boxhead">' + seg + "</div>" + table("2fr 1.4fr 1fr 2fr", ["Item", "Model", "Status", "Where now"], rows, "Nothing matches this filter."), "ion-panel");
  }

  /* ---------- Desk book ---------- */
  function message(m) {
    return '<article class="cs-msg"><span class="t-label t-muted">' + esc(m.time) + "</span><p><strong>" + esc(m.from) + "</strong> · " + esc(people[m.from]) + "</p><p>" + esc(m.text) + "</p></article>";
  }
  function deskbook() {
    const list = messages.filter((m) => m.phase <= s.phase).reverse();
    return head("Desk <span class=\"ion-accent\">book</span>", "Messages from clubs, linked to their request. Who has what is kept on each loan, so there are no handover notes to write.") +
      card(list.map((m) => message(m) + '<div class="cs-msg__link">' + reqLink(getReq(m.req)) + "</div>").join(""), "ion-panel");
  }

  function brief() {
    return head("Would you keep this <span class=\"ion-accent\">product?</span>", "") +
      card('<div class="cs-brief"><p>Work a shift at the campus media desk. Get the Film Society’s kit out for its screening, handle the return, and leave the next shift enough information to finish the job. Use the time control to move the story forward.</p>' +
        "<p>Show one moment the product handles well and one moment you would change. Use a specific action or decision from your shift as evidence for each.</p>" +
        "<p>Sketch or prototype your change. Walk us through the same job using it, explain what you would keep, and name one observation at a real counter that would tell you whether it helped.</p>" +
        "<p>Use any tools you like, including AI assistants, web search, and design or coding tools.</p></div>");
  }

  const screens = {
    Today: today,
    Requests: () => (s.selected ? requestDetail(getReq(s.selected)) : requestList()),
    "Take back": takeBack,
    Inventory: inventory,
    "Desk book": deskbook,
    "Candidate brief": brief,
  };

  /* ---------- Paint ---------- */
  let syncingNav = false;
  function syncNav() {
    const item = q('.ion-sidebar__item[data-tab="' + s.tab + '"]');
    if (!item || item.getAttribute("aria-current") === "page") return;
    if (root.sidebar) {
      syncingNav = true;
      root.sidebar.select(item);
      syncingNav = false;
    } else {
      root.querySelectorAll(".ion-sidebar__item").forEach((i) => i.removeAttribute("aria-current"));
      item.setAttribute("aria-current", "page");
      q("[data-sidebar-title]").textContent = s.tab;
    }
  }
  function paint() {
    q("[data-clock]").textContent = shifts[s.phase].time;
    syncNav();
    const outCount = openLines().length;
    q("[data-out-count]").textContent = outCount || "";
    const page = q("[data-page]");
    page.innerHTML = (s.tab === "Candidate brief" ? "" : storyCard()) + screens[s.tab]();
    q("[data-status]").textContent = s.notice;
    const undo = q('[data-action="undo"]');
    undo.hidden = !s.undo;
    if (window.lucide) lucide.createIcons();
    if (window.Ion) Ion.init(page);
    if (s.focus) {
      const el = q(s.focus);
      if (el) el.focus();
      s.focus = "";
    }
  }
  function commit(msg) {
    if (msg) s.notice = msg;
    paint();
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...s, error: null, focus: "" }));
    } catch {
      q("[data-status]").textContent += " Browser storage is unavailable. Progress lasts for this visit.";
    }
  }
  const snapshot = (label) => {
    s.undo = { label, loans: JSON.stringify(s.loans), followUp: [...s.followUp] };
  };
  const reset = () => {
    s.error = null;
  };

  /* ---------- Actions ---------- */
  function addCode(raw) {
    const code = String(raw || "").trim().toUpperCase().replace(/\s+/g, "").replace(/^([A-Z]{2})(\d)/, "$1-$2");
    const a = getAsset(code);
    s.focus = ".cs-input--code";
    if (!code) return (s.error = { at: "code", text: "Type the code from the item’s label, for example PR-04." });
    if (!a) return (s.error = { at: "code", text: "No item has the code " + code + ". Check the label on the item." });
    if (a.repair) return (s.error = { at: "code", text: code + " (" + a.type + ") is booked in for repair, not on loan. Check the label." });
    const o = openLine(code);
    if (!o) return (s.error = { at: "code", text: code + " (" + a.type + ") is already on the shelf in bin " + a.bin + ". It isn’t on any loan, so check the label." });
    if (s.basket.includes(code)) return (s.error = { at: "code", text: code + " is already in the list." });
    s.basket.push(code);
    if (s.basket.length === 1) s.returnedBy = o.line.holder;
  }

  function confirmReturn(by) {
    if (!s.basket.length) return;
    snapshot("return");
    const touched = new Set();
    for (const code of s.basket) {
      const o = openLine(code);
      if (!o) continue;
      Object.assign(o.line, { back: true, returnedAt: shifts[s.phase].short, returnedBy: by });
      touched.add(o.loan);
    }
    const parts = ["Returned " + s.basket.join(", ") + " from " + by + "."];
    for (const loan of touched) {
      const r = getReq(loan.req), left = loan.lines.filter((l) => !l.back).length;
      if (!left) {
        s.followUp = s.followUp.filter((n) => n !== loan.num);
        parts.push(r.club + " kit complete" + (missingItems(r, loan).length ? " (some items were never handed out)." : ": everything is back."));
      } else if (!s.followUp.includes(loan.num)) {
        s.followUp.push(loan.num);
        parts.push(left + " " + r.club + " item" + (left > 1 ? "s" : "") + " still out.");
      }
    }
    s.basket = [];
    s.returnedBy = "";
    s.notice = parts.join(" ");
  }

  function issueKit(r) {
    const d = s.draft;
    if (!members(r.club).includes(d.who)) return (s.error = { at: "issue", text: "Choose which " + r.club + " member is collecting the kit." });
    const chosen = d.units.map((id, i) => [i, id]).filter(([, id]) => id);
    if (!chosen.length) return (s.error = { at: "issue", text: "Choose at least one unit to hand out." });
    for (const [i, id] of chosen) {
      const a = getAsset(id);
      if (!a || a.type !== r.items[i] || status(a) !== "On shelf")
        return (s.error = { at: "issue", text: id + " can’t be handed out. Choose a unit that’s on the shelf." });
    }
    if (new Set(chosen.map(([, id]) => id)).size !== chosen.length) return (s.error = { at: "issue", text: "The same unit is chosen twice." });
    const missing = r.items.filter((_, i) => !d.units[i]);
    if (missing.length && !s.warned) {
      s.warned = true;
      return (s.error = { at: "issue", text: "Not handing out: " + missing.join(", ") + ". The kit will leave incomplete. " + r.note.split(".")[0] + "." });
    }
    snapshot("issue");
    const num = Math.max(400, ...s.loans.map((l) => l.num)) + 1;
    s.loans.push({
      num, req: r.id, collectedBy: d.who, issuedAt: shifts[s.phase].short,
      lines: chosen.map(([, id]) => ({ asset: id, back: false, holder: d.who, expected: "", returnedAt: "", returnedBy: "" })),
    });
    s.issuing = false;
    s.draft = null;
    s.warned = false;
    s.notice = "Handed out " + chosen.length + " item" + (chosen.length > 1 ? "s" : "") + " to " + d.who + " on loan L-" + num + ". " + r.owner + " stays responsible.";
  }

  function saveHolders(form) {
    const loan = getLoan(Number(form.dataset.loan));
    if (!loan) return;
    const r = getReq(loan.req), data = new FormData(form), changes = [];
    const lines = loan.lines.filter((l) => !l.back && data.has("holder-" + l.asset));
    for (const line of lines) {
      if (!data.get("exp-" + line.asset)) return (s.error = { at: "holder", text: "Choose when " + line.asset + " is expected back." });
      if (!members(r.club).includes(data.get("holder-" + line.asset))) return (s.error = { at: "holder", text: "Choose a " + r.club + " member." });
    }
    snapshot("update");
    for (const line of lines) {
      line.holder = data.get("holder-" + line.asset);
      line.expected = data.get("exp-" + line.asset);
      changes.push(line.asset + " with " + line.holder + ", expected " + line.expected);
    }
    s.followUp = s.followUp.filter((n) => n !== loan.num);
    s.editLine = "";
    s.notice = "Loan L-" + loan.num + " updated: " + changes.join("; ") + ".";
  }

  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const v = b.dataset.val;
    reset();
    switch (b.dataset.action) {
      case "restart":
        s = original();
        break;
      case "advance": {
        const warning = advanceWarning();
        if (warning && v !== "force" && !s.confirmAdvance) {
          s.confirmAdvance = warning;
          break;
        }
        s.confirmAdvance = false;
        if (s.phase < 2) s.phase++;
        s.undo = null;
        s.notice = "Desk time is now " + shifts[s.phase].time + ".";
        break;
      }
      case "stay":
        s.confirmAdvance = false;
        break;
      case "undo":
        if (!s.undo) return;
        s.loans = JSON.parse(s.undo.loans);
        s.followUp = s.undo.followUp;
        s.undo = null;
        s.issuing = false;
        s.notice = "Undone. The records are back to how they were.";
        return commit();
      case "close":
        s.selected = "";
        s.issuing = false;
        s.editLine = "";
        break;
      case "open-req":
        s.tab = "Requests";
        s.selected = v;
        s.issuing = false;
        s.editLine = "";
        break;
      case "issue": {
        const r = getReq(v);
        const named = members(r.club).find((p) => p !== r.owner && messages.some((m) => m.req === r.id && m.phase <= s.phase && m.text.includes(p)));
        s.issuing = true;
        s.warned = false;
        s.draft = {
          who: named || "",
          suggested: named || "",
          units: r.items.map((type) => (assets.find((a) => a.type === type && status(a) === "On shelf") || { id: "" }).id),
        };
        break;
      }
      case "cancel-issue":
        s.issuing = false;
        s.draft = null;
        break;
      case "edit-line":
        s.editLine = v;
        break;
      case "cancel-edit":
        s.editLine = "";
        break;
      case "remove-code":
        s.basket = s.basket.filter((c) => c !== v);
        break;
      case "skip-follow":
        s.followUp.shift();
        break;
      default:
        return;
    }
    commit();
  });

  root.addEventListener("sidebarnavigate", (e) => {
    if (syncingNav) return;
    const tab = e.detail.item.dataset.tab;
    if (!tabs.includes(tab)) return;
    reset();
    s.tab = tab;
    s.selected = "";
    s.issuing = false;
    s.editLine = "";
    commit();
  });

  root.addEventListener("change", (e) => {
    const seg = e.target.closest("[data-segmented]");
    if (seg && e.detail && seg.dataset.name === "filter") {
      s.filter = e.detail.value;
      return commit();
    }
    const t = e.target;
    if (t.closest("[data-issue]") && s.draft) {
      if (t.name === "who") s.draft.who = t.value;
      else if (t.name.startsWith("unit-")) s.draft.units[Number(t.name.slice(5))] = t.value;
      // Any change answers the warning, so clear it and reset the button without a full repaint.
      s.warned = false;
      s.error = null;
      const form = t.closest("[data-issue]");
      const warn = form.querySelector(".cs-error");
      if (warn) warn.remove();
      form.querySelector('button[type="submit"]').textContent = "Hand out kit";
    } else if (t.name === "returnedBy") s.returnedBy = t.value;
  });

  root.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    reset();
    if (f.matches("[data-code]")) addCode(new FormData(f).get("code"));
    else if (f.matches("[data-confirm-return]")) {
      const by = String(new FormData(f).get("returnedBy") || "");
      if (!by) s.error = { at: "return", text: "Choose who brought the items back." };
      else confirmReturn(by);
    } else if (f.matches("[data-issue]") && s.selected) issueKit(getReq(s.selected));
    else if (f.matches("[data-holder]")) saveHolders(f);
    commit();
  });

  /* ---------- Saved shift ---------- */
  function restore(d) {
    const validLine = (l) => l && getAsset(l.asset) && typeof l.back === "boolean" && people[l.holder] && (!l.expected || dueAt[l.expected]);
    if (
      !d || d.version !== 2 || !tabs.includes(d.tab) || !shifts[d.phase] || (d.selected && !getReq(d.selected)) ||
      !Array.isArray(d.loans) || !d.loans.length ||
      !d.loans.every((l) => l && Number.isInteger(l.num) && getReq(l.req) && people[l.collectedBy] && Array.isArray(l.lines) && l.lines.length && l.lines.every(validLine))
    )
      return;
    s = {
      ...original(),
      tab: d.tab,
      phase: d.phase,
      selected: d.selected || "",
      filter: ["All items", "On shelf", "On loan", "In repair"].includes(d.filter) ? d.filter : "All items",
      loans: d.loans.map((l) => ({ ...l, lines: l.lines.map((x) => ({ ...x })) })),
      notice: "Welcome back. Your sample shift was restored.",
    };
    s.followUp = Array.isArray(d.followUp) ? d.followUp.filter((n) => getLoan(n) && getLoan(n).lines.some((l) => !l.back)) : [];
  }
  try {
    restore(JSON.parse(localStorage.getItem(storageKey)));
  } catch {
    // Keep the fresh shift when storage is unavailable or the saved data is invalid.
  }
  syncNav();
  // Ion initialises the shell on DOMContentLoaded; paint after it so the page content is set up once.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
  else paint();
})();
