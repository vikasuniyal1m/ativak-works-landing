module.exports = {
  content: ["../index.html", "../thank-you/index.html", "../privacy-policy.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Poppins', 'sans-serif'],
      },
      colors: {
        kotlis: {
          gold: 'rgb(var(--kotlis-gold-rgb-sp) / <alpha-value>)',
          goldHover: 'var(--kotlis-gold-hover)',
          glow: 'var(--kotlis-glow)',
          bg: 'var(--kotlis-bg)',
          card: 'rgb(var(--kotlis-card-rgb) / <alpha-value>)',
          dark: 'rgb(var(--kotlis-dark-rgb) / <alpha-value>)',
          subtle: 'var(--kotlis-subtle)',
          border: 'var(--kotlis-border)',
          fill: 'var(--kotlis-fill)'
        }
      }
    }
  }
}
