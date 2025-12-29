/** @type {import('tailwindcss').Config} */
export default {
content: [
"./index.html",
"./src/**/*.{js,ts,jsx,tsx}",
],
theme: {
extend: {
colors: {
primary: '#7b13d1', // Senin ana rengin
secondary: '#5a0e99', // Biraz daha koyusu (hover için)
background: '#f3e8ff', // Çok açık mor (arkaplan için)
}
},
},
plugins: [],
}