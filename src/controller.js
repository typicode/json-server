const shelveCategories = [
  {
    id: 1,
    label: "Action",
  },
  {
    id: 2,
    label: "Epopea",
  },
  {
    id: 3,
    label: "Triler",
  },
];

const shelvesList = [
  {
    id: 1,
    title: "Literatura pentru copii",
    categories: [shelveCategories[1], shelveCategories[2]],
    description: "some category",
  },
  {
    id: 2,
    title: "Literatura pentru adulti",
    categories: [shelveCategories[0]],
    description: "some category 2",
  },
];

const booksList = [
  {
    id: 1,
    title: "Scufita rosie",
    shelve_id: 1,
    category: shelveCategories[0],
    description: "Scufita rosie book",
  },
  {
    id: 2,
    shelve_id: 1,
    title: "Scufita rosie partea a 2",
    category: shelveCategories[1],
    description: "Scufita rosie book",
  },
  {
    id: 3,
    shelve_id: null,
    title: "Scufita rosie III",
    category: shelveCategories[2],
    description: "Scufita rosie book",
  },
];

const getShelveCategories = (labels) => {
  let newShelveCategories = [];

  const categoriesLabels = shelveCategories.map((cat) => cat.label);

  labels.forEach((label) => {
    if (categoriesLabels.includes(label)) {
      // add from existent categories
      newShelveCategories.push(category);
    } else {
      // add new category to 'shelveCategories' object
      shelveCategories.push({
        id: shelveCategories.length + 1,
        label,
      });
    }
  });

  return newShelveCategories;
};

function login(req, res) {
  const { email, password } = req.body;

  if (email === "test@mail.com" && password === "secret") {
    res.sendStatus(403).json({
      err: "invalid credentials",
    });
  } else {
    res.status(200).json({
      access_token: "ewdefewfdf4freg4543fr44",
      expires_in: 3600,
    });
  }
}

function logout(_, res) {
  res.status(200).json({
    status: "ok man!",
  });
}

function getAccountDetails(_, res) {
  res.status(200).json({
    email: "test@mail.com",
  });
}

function getUserShelves(_, res) {
  res.status(200).json({
    itemsCount: shelvesList.length,
    items: shelvesList,
  });
}

function addShelve(req, res) {
  const { title, description, categories } = req.body;

  const newShelve = {
    id: shelvesList.length + 1,
    title: title,
    description: description,
    categories: getShelveCategories(categories),
  };

  res.status(200).json(newShelve);
}

function getUserBooks(_, res) {
  res.status(200).json({
    itemsCount: booksList.length,
    items: booksList,
  });
}

module.exports = {
  login,
  logout,
  getAccountDetails,
  getUserShelves,
  getUserBooks,
  addShelve,
};
