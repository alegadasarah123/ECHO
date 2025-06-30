const express = require('express');
const path = require('path');
const app = express();

// Serve everything from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Handle unknown routes (Optional)
app.use((req, res) => {
  res.status(404).send('Page not found');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
