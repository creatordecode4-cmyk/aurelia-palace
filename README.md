# Aurelia Palace

A cinematic website for **Aurelia Palace**, a heritage palace hotel on the ghats of Varanasi.
The page walks a guest through their arrival in order: exterior → carved doors (they open as you scroll) →
lobby → reception → key 512 → corridor → suite → dining → spa → reservation.

Built with React + Vite. No backend; the reservation form works only on the client.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the build
```

## Structure

```
public/images/   bahar, darwaza, lobby, reception, key, corridor,
                 room1–3, restaurant, spa (.jpg)
src/data.js      all copy, chapters, suite rooms and room rates
src/App.jsx      page sections and scroll effects
src/styles.css   design (maroon + gold palette, responsive)
```

To change the text or prices, edit `src/data.js`. To swap a photo, replace the file in `public/images/` and keep the same name.
