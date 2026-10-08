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
  fetch("/api/payments/config", { headers: { accept: "application/json" } })
    .then((r) => r.json())
    .then((j) => {
      config = j;
      if (!j.available) {
        button.disabled = true;
        setStatus("Online payments are being activated. You can still confirm your project on WhatsApp.", "pending");
      } else {
        button.disabled = false;
        setStatus("Secure checkout is ready.", "ready");
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
      const orderResponse = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(data)
      });
      const order = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok || !order.ok) throw new Error(order.error || "Could not start payment.");

      await loadCheckout();

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Xender Secrets",
        description: order.offer?.name || "Website project payment",
        order_id: order.orderId,
        prefill: {
          name: String(data.name || ""),
          email: String(data.email || ""),
          contact: String(data.phone || "")
        },
        notes: {
          offer: String(data.offer || ""),
          quote_reference: String(data.reference || "")
        },
        handler: async (response) => {
          setStatus("Payment received. Verifying…", "working");
          const verifyResponse = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify(response)
          });
          const verified = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok || !verified.ok) {
            setStatus("Payment was received but automatic verification failed. Please contact us with your payment ID.", "error");
            button.disabled = false;
            return;
          }
          const q = new URLSearchParams({
            payment_id: verified.paymentId,
            order_id: verified.orderId
          });
          location.href = "/payment-success?" + q.toString();
        },
        modal: {
          ondismiss: () => {
            button.disabled = false;
            setStatus("Checkout closed. No payment was made.", "pending");
          }
        }
      });
      checkout.on("payment.failed", (response) => {
        button.disabled = false;
        setStatus(response?.error?.description || "Payment failed. You can retry safely.", "error");
      });
      checkout.open();
    } catch (error) {
      button.disabled = false;
      setStatus(error?.message || "Could not start payment. Please try again.", "error");
    }
  });
})();
