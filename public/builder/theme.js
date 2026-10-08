/* Applies the saved theme before first paint (CSP forbids inline scripts on /builder pages). */
try { if (localStorage.getItem("xs-theme") === "dark") document.documentElement.dataset.theme = "dark"; } catch (e) {}
