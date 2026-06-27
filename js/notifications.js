// Custom non-blocking Toast notification system
export class NotificationManager {
  static show(message, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast glass ${type}`;
    
    // Inline styling fallback for toast context UI
    toast.style.padding = "16px 24px";
    toast.style.borderRadius = "14px";
    toast.style.color = "#fff";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "12px";
    toast.style.minWidth = "280px";
    toast.style.background = type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)";
    toast.style.border = `1px solid ${type === "success" ? "var(--success)" : "#EF4444"}`;

    const icon = type === "success" ? "fa-circle-check" : "fa-circle-exclamation";
    toast.innerHTML = `
      <i class="fas ${icon}" style="color:${type === "success" ? "var(--success)" : "#EF4444"}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "opacity 0.3s, transform 0.3s";
      setTimeout(() => toast.remove(), 3000);
    }, 4000);
  }
}