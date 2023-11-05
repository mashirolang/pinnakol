const express = require("express");
const app = express();
const port = 3000;

const { 
  getToken, 
  getClassLists, 
  getClassDetails,
  getClassLibraries
} = require('./functions.js')


app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/get-token", async (req, res) => {
  const token = await getToken(/** Login Credentials */)
  res.send(token)
})

app.get("/classlists", async (req, res) => {
  const token = await getToken(/** Login Credentials */)
  const classlist = await getClassLists(token)
  res.send(classlist)
})

app.get("/classlists/:classId", async (req, res) => {
  const { classId } = req.params
  const token = await getToken(/** Login Credentials */)
  const classDetails = await getClassDetails(token, classId)

  res.send(classDetails)
})

app.get("/library/:classId", async (req, res) => {
  const { classId } = req.params
  const token = await getToken(/** Login Credentials */)
  const classDetails = await getClassLibraries(token, classId)

  res.json({
    libraries: classDetails
  })
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
