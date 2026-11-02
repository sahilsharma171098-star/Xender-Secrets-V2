(() => {
  const form = document.querySelector("[data-payment-form]");
  if (!form) return;

  const button = form.querySelector("[data-pay-button]");
  const status = form.querySelector("[data-payment-status]");
  const offerSelect = form.querySelector("[name=offer]");

  const setStatus = (message, kind = "") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
  };

  const money = (paise) => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(Number(paise || 0) / 100);

  const loadCheckout = () => new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector('script[data-razorpay-checkout]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.dataset.razorpayCheckout = "1";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  let config = null;
  fetch("/api/payu/config", { headers: { accept: "application/json" } })
    .then((r) => r.json())
    .then((j) => {
      config = j;
      if (!j.available) {
        button.disabled = true;
        setStatus("Online payments are being activated. You can still confirm your project on WhatsApp.", "pending");
      } else {
        button.disabled = false;
        setStatus("PayU secure checkout is ready. Email and phone are required.", "ready");
        button.textContent = "Pay securely with PayU";
      }
    })
    .catch(() => {
      button.disabled = true;
      setStatus("Could not load payment status. Please try again shortly.", "error");
    });

  offerSelect?.addEventListener("change", () => {
    const o = config?.offers?.find((x) => x.id === offerSelect.value);
    const amount = form.querySelector("[data-payment-total]");
    if (amount && o) amount.textContent = money(o.amountPaise) + " incl. GST";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!config?.available) return;

    const data = Object.fromEntries(new FormData(form).entries());
    button.disabled = true;
    setStatus("Starting secure checkout…", "working");

    try {
      if (!data.email || !data.phone) throw new Error("PayU requires both email and phone.");
      const orderResponse = await fetch("/api/payu/initiate", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(data)
      });
      const order = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok || !order.ok || !order.fields || order.url !== "https://secure.payu.in/_payment") {
        throw new Error(order.error || "Could not start PayU checkout.");
      }
      const checkoutForm = document.createElement("form");
      checkoutForm.method = "POST";
      checkoutForm.action = order.url;
      checkoutForm.style.display = "none";
      for (const [key, value] of Object.entries(order.fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value ?? "");
        checkoutForm.append(input);
      }
      document.body.append(checkoutForm);
      setStatus("Redirecting to PayU secure checkout…", "working");
      checkoutForm.submit();
    } catch (error) {
      button.disabled = false;
      setStatus(error?.message || "Could not start payment. Please try again.", "error");
    }
  });
})();
