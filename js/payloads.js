/* Content types: what goes INSIDE the QR code.
   Each type has form fields and a build() that returns the text to encode. */
(function (Q) {
  const enc = encodeURIComponent;
  const wifiEsc = s => String(s || "").replace(/([\\;,:"])/g, "\\$1");
  const vcEsc = s => String(s || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
  const normUrl = u => { u = String(u || "").trim(); if (!u) return ""; return /^[a-z][a-z0-9+.-]*:\/\//i.test(u) || /^(mailto|tel|sms|geo):/i.test(u) ? u : "https://" + u; };
  const digits = s => String(s || "").replace(/[^\d+]/g, "");
  const dt = s => (s ? s.replace(/[-:]/g, "").replace(/^(\d{8}T\d{4})$/, "$100") : "");

  const SOCIAL = {
    github:   { label: "GitHub",    url: u => "https://github.com/" + u },
    linkedin: { label: "LinkedIn",  url: u => "https://www.linkedin.com/in/" + u },
    instagram:{ label: "Instagram", url: u => "https://instagram.com/" + u },
    x:        { label: "X (Twitter)", url: u => "https://x.com/" + u },
    tiktok:   { label: "TikTok",    url: u => "https://www.tiktok.com/@" + u },
    youtube:  { label: "YouTube",   url: u => "https://youtube.com/@" + u },
    facebook: { label: "Facebook",  url: u => "https://facebook.com/" + u },
  };

  const ICONS = {
    url: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    text: "M4 7V4h16v3M9 20h6M12 4v16",
    wifi: "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
    vcard: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    email: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
    phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
    sms: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    whatsapp: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
    geo: "M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    event: "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 2v4M8 2v4M3 10h18",
    social: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98",
  };

  const TYPES = [
    { id: "url", label: "Website", hint: "Link to any web page. Best for portfolios and shops.",
      fields: [{ k: "url", label: "Website link", type: "url", ph: "https://example.com", def: "" }],
      build: v => normUrl(v.url) },
    { id: "text", label: "Text", hint: "Any plain text, up to a few hundred characters.",
      fields: [{ k: "text", label: "Your text", type: "textarea", ph: "Type anything…", def: "" }],
      build: v => (v.text || "").trim() },
    { id: "social", label: "Social", hint: "Send people straight to your profile.",
      fields: [
        { k: "platform", label: "Platform", type: "select", opts: Object.entries(SOCIAL).map(([k, o]) => [k, o.label]), def: "github" },
        { k: "user", label: "Username or profile link", type: "text", ph: "e.g. Sneeuman", def: "" },
      ],
      build: v => { let u = String(v.user || "").trim(); if (!u) return ""; if (/^https?:\/\//i.test(u)) return u; return SOCIAL[v.platform || "github"].url(u.replace(/^@/, "")); } },
    { id: "wifi", label: "Wi-Fi", hint: "Guests scan to join your network, no password typing.",
      fields: [
        { k: "ssid", label: "Network name (SSID)", type: "text", def: "" },
        { k: "pass", label: "Password", type: "text", def: "" },
        { k: "sec", label: "Security", type: "select", opts: [["WPA", "WPA/WPA2/WPA3"], ["WEP", "WEP"], ["nopass", "None"]], def: "WPA" },
        { k: "hidden", label: "Hidden network", type: "checkbox", def: false },
      ],
      build: v => v.ssid ? `WIFI:T:${v.sec || "WPA"};S:${wifiEsc(v.ssid)};${v.sec === "nopass" ? "" : `P:${wifiEsc(v.pass)};`}${v.hidden ? "H:true;" : ""};` : "" },
    { id: "vcard", label: "Contact", hint: "Scanning adds you to the phone's contacts.",
      fields: [
        { k: "first", label: "First name", type: "text", def: "" }, { k: "last", label: "Last name", type: "text", def: "" },
        { k: "org", label: "Company", type: "text", def: "" }, { k: "title", label: "Job title", type: "text", def: "" },
        { k: "phone", label: "Phone", type: "tel", def: "" }, { k: "email", label: "Email", type: "email", def: "" },
        { k: "web", label: "Website", type: "url", def: "" },
        { k: "street", label: "Street", type: "text", def: "" }, { k: "city", label: "City", type: "text", def: "" }, { k: "country", label: "Country", type: "text", def: "" },
      ],
      build: v => {
        if (!(v.first || v.last || v.org)) return "";
        const L = ["BEGIN:VCARD", "VERSION:3.0", `N:${vcEsc(v.last)};${vcEsc(v.first)};;;`, `FN:${vcEsc([v.first, v.last].filter(Boolean).join(" ") || v.org)}`];
        if (v.org) L.push("ORG:" + vcEsc(v.org)); if (v.title) L.push("TITLE:" + vcEsc(v.title));
        if (v.phone) L.push("TEL;TYPE=CELL:" + vcEsc(v.phone)); if (v.email) L.push("EMAIL:" + vcEsc(v.email));
        if (v.web) L.push("URL:" + normUrl(v.web));
        if (v.street || v.city || v.country) L.push(`ADR;TYPE=WORK:;;${vcEsc(v.street)};${vcEsc(v.city)};;;${vcEsc(v.country)}`);
        L.push("END:VCARD"); return L.join("\n");
      } },
    { id: "email", label: "Email", hint: "Opens a ready-to-send email.",
      fields: [{ k: "to", label: "To", type: "email", def: "" }, { k: "subject", label: "Subject", type: "text", def: "" }, { k: "body", label: "Message", type: "textarea", def: "" }],
      build: v => { if (!v.to) return ""; const q = [v.subject && "subject=" + enc(v.subject), v.body && "body=" + enc(v.body)].filter(Boolean).join("&"); return "mailto:" + v.to.trim() + (q ? "?" + q : ""); } },
    { id: "phone", label: "Call", hint: "Dials a phone number.",
      fields: [{ k: "num", label: "Phone number", type: "tel", ph: "+27 82 123 4567", def: "" }],
      build: v => v.num ? "tel:" + digits(v.num) : "" },
    { id: "sms", label: "SMS", hint: "Opens a text message with your text pre-filled.",
      fields: [{ k: "num", label: "Phone number", type: "tel", def: "" }, { k: "msg", label: "Message", type: "textarea", def: "" }],
      build: v => v.num ? `sms:${digits(v.num)}${v.msg ? "?body=" + enc(v.msg) : ""}` : "" },
    { id: "whatsapp", label: "WhatsApp", hint: "Starts a chat with you. Use the full international number.",
      fields: [{ k: "num", label: "Number with country code", type: "tel", ph: "27821234567", def: "" }, { k: "msg", label: "First message (optional)", type: "textarea", def: "" }],
      build: v => digits(v.num).replace(/^\+/, "") ? `https://wa.me/${digits(v.num).replace(/^\+/, "")}${v.msg ? "?text=" + enc(v.msg) : ""}` : "" },
    { id: "geo", label: "Location", hint: "Opens a map at these coordinates.",
      fields: [{ k: "lat", label: "Latitude", type: "text", ph: "-29.0852", def: "" }, { k: "lng", label: "Longitude", type: "text", ph: "26.1596", def: "" }],
      build: v => (isFinite(parseFloat(v.lat)) && isFinite(parseFloat(v.lng))) ? `geo:${parseFloat(v.lat)},${parseFloat(v.lng)}` : "" },
    { id: "event", label: "Event", hint: "Adds an event to the phone's calendar.",
      fields: [
        { k: "title", label: "Title", type: "text", def: "" }, { k: "start", label: "Starts", type: "datetime-local", def: "" },
        { k: "end", label: "Ends", type: "datetime-local", def: "" }, { k: "loc", label: "Location", type: "text", def: "" },
        { k: "desc", label: "Description", type: "textarea", def: "" },
      ],
      build: v => (v.title && v.start) ? ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "SUMMARY:" + vcEsc(v.title), "DTSTART:" + dt(v.start), v.end && "DTEND:" + dt(v.end), v.loc && "LOCATION:" + vcEsc(v.loc), v.desc && "DESCRIPTION:" + vcEsc(v.desc), "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\n") : "" },
  ];

  Q.payloads = {
    TYPES, ICONS, normUrl,
    byId: id => TYPES.find(t => t.id === id) || TYPES[0],
    defaults() { const o = {}; TYPES.forEach(t => { o[t.id] = {}; t.fields.forEach(f => o[t.id][f.k] = f.def); }); return o; },
    build(type, vals) { try { return Q.payloads.byId(type).build(vals || {}); } catch { return ""; } },
  };
})(window.QRS = window.QRS || {});
