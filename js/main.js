// Global navigation helper
function navigate(path) {
  window.location.href = path;
}

// Contact form logic (example - replace with your preferred backend)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Form submitted! (Add email backend logic here)");
    });
  }
});
