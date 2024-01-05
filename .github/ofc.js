let database = {
  "cervejas": [
    {
      "id": 1,
      "title": "Super birra ambrata",
      "aluno": "8%",
      "description": "Cerveja Amber Abbey."
    },
    {
      "id": 2,
      "title": "Noel birra bruna",
      "aluno": "9%",
      "description": "Strong Dark Ale. Sazonal - natal."
    },
    {
      "id": 3,
      "title": "Elixir birra demi-sec",
      "aluno": "10%",
      "description": "Strong Amber Ale."
    },
    {
      "id": 4,
      "title": "Isaac birra bianca",
      "aluno": "5%",
      "description": "Witbier. Estilo belga. Aromatizada com coentro e casca de laranja."
    }
  ]
};

// Realizar a busca de toda lista de itens do JSON (GET)
let listaCervejas = database.cervejas;

// Realizar um loop por cada item da variável
for (let cerveja of listaCervejas) {
  // Cada iteração deve realizar print do título
  console.log(cerveja.title);

  // Realizar a busca do mesmo item no JSON pelo campo title
  let cervejaAtualizada = listaCervejas.find(item => item.title === cerveja.title);

  // Realizar a inserção de um novo item no JSON
  let novoItem = { "title": "new", "alcohol": "0%", "description": "new item" };
  listaCervejas.push(novoItem);

  // Realizar a atualização desse novo item no JSON
  cervejaAtualizada.title = "new item";

  // Remover o primeiro item do JSON server de título “Super birra ambrata”
  listaCervejas = listaCervejas.filter(item => item.title !== "Super birra ambrata");
}

console.log("JSON atualizado:", database.cervejas);
