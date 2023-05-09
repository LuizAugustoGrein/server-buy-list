import express from "express";
import cors from "cors";
const jwt = require("jsonwebtoken");
const config = require("../config");
import { knex } from "./lib/knex";

const PORT = process.env.PORT || 3333;

const HOSTNAME = process.env.HOSTNAME || "http://localhost";

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res, _next) => {
  res.send({
    msg: "servidor rodando",
  });
});

app.post("/users", async (req, res, _next) => {
  var data = req.body;

  if (!data.email || !data.name || !data.user || !data.password) {
    res.status(400).send({
      msg: "campos obrigatorios nao preenchidos",
    });
    return;
  }

  const userExists = await knex
    .select("id")
    .from("users")
    .where({ user: data.user });

  if (userExists[0]) {
    res.status(400).send({
      msg: "usuario ja existente",
    });
    return;
  }

  knex("users")
    .insert({
      user: data.user,
      name: data.name,
      email: data.email,
      password: data.password,
    })
    .then(async () => {
      var token = jwt.sign(
        {
          user: data.user,
          password: data.password,
        },
        config.secretKey
      );

      const createdUser = await knex
        .select("id")
        .from("users")
        .where({ email: data.email });

      knex("authentications")
        .insert({
          user_id: createdUser[0].id,
          token: token,
        })
        .then(() => {
          res.send({
            token: token,
          });
        });
    });
});

app.post("/users/token", async (req, res, _next) => {
  var data = req.body;

  if (!data.token) {
    res.send({
      msg: "campos obrigatorios nao preenchidos",
      login: false,
    });
    return;
  }

  var login = false;

  const authentications = await knex
    .select("id")
    .from("authentications")
    .where({ token: data.token });

  if (authentications[0]) {
    login = true;
  } else {
    login = false;
  }

  res.send({
    login: login,
  });
});

app.post("/users/login", async (req, res, _next) => {
  var data = req.body;

  if (!data.user || !data.password) {
    res.status(400).send({
      msg: "campos obrigatorios nao preenchidos",
    });
    return;
  }

  const user = await knex.select("id").from("users").where({
    user: data.user,
    password: data.password,
  });

  if (user[0]) {
    var token = jwt.sign(
      {
        user: data.user,
        password: data.password,
      },
      config.secretKey
    );

    knex("authentications")
      .insert({
        user_id: user[0].id,
        token: token,
      })
      .then(() => {
        res.send({
          token: token,
        });
      });
  } else {
    res.status(400).send({
      msg: "usuario e/ou senha incorretos",
    });
    return;
  }
});

app.get("/products", async (req, res, _next) => {
  const products = await knex.select("*").from("products");
  res.send({
    products: products,
  });
});

app.post("/products", async (req, res, _next) => {
  var data = req.body;

  if (
    !data.name ||
    !data.brand ||
    !data.price ||
    !data.validity ||
    !data.description
  ) {
    res.status(400).send({
      msg: "campos obrigatorios nao preenchidos",
    });
    return;
  }

  knex("products")
    .insert({
      name: data.name,
      brand: data.brand,
      price: data.price,
      validity: data.validity,
      description: data.description,
    })
    .then(async () => {
      res.send({
        msg: "Produto criado com sucesso",
      });
    });
});

app.put("/products/:id", async (req, res, _next) => {
  var data = req.body;
  var id = req.params.id;

  if (
    !data.name ||
    !data.brand ||
    !data.price ||
    !data.validity ||
    !data.description
  ) {
    res.status(400).send({
      msg: "campos obrigatorios nao preenchidos",
    });
    return;
  }

  knex("products")
    .where({
      id: id,
    })
    .update({
      name: data.name,
      brand: data.brand,
      price: data.price,
      validity: data.validity,
      description: data.description
    })
    .then(() => {
      res.send({
        msg: "produto atualizado",
      });
    });
});

app.get("/products/:id", async (req, res, _next) => {
  var id = req.params.id;

  const product = await knex.select("*").from("products").where({
    id: id,
  });

  res.send(product[0]);
});

app.get("/carts", async (req, res, _next) => {
  var token = req.headers.token;

  const authentications = await knex
    .select("user_id")
    .from("authentications")
    .where({
      token: token,
    });

  if (!authentications[0]) {
    res.send({
      error: true,
      msg: "token invalido",
    });
    return;
  } else {
    var user_id = authentications[0].user_id;
    const carts = await knex.select("*").from("cart").where({
      user_id: user_id,
    });
    res.send({
      carts: carts,
    });
  }
});

app.post("/carts", async (req, res, _next) => {
  var token = req.headers.token;

  const authentications = await knex
    .select("user_id")
    .from("authentications")
    .where({
      token: token,
    });

  if (!authentications[0]) {
    res.send({
      error: true,
      msg: "token invalido",
    });
    return;
  } else {
    var user_id = authentications[0].user_id;
    knex("cart")
      .insert({
        total_price: 0,
        status: "P",
        user_id: user_id,
      })
      .then(async () => {
        res.send({
          msg: "Carrinho criado com sucesso",
        });
      });
  }
});

app.put("/carts/:id", async (req, res, _next) => {
  var token = req.headers.token;
  var cart_id = req.params.id;
  var data = req.body;

  if (!data.status) {
    res.send({
      error: true,
      msg: "campos obrigatorios nao preenchidos",
    });
    return;
  }

  const authentications = await knex
    .select("user_id")
    .from("authentications")
    .where({
      token: token,
    });

  if (!authentications[0]) {
    res.send({
      error: true,
      msg: "token invalido",
    });
    return;
  } else {
    var user_id = authentications[0].user_id;
    var found = false;
    const carts = await knex.select("*").from("cart").where({
      user_id: user_id,
    });
    carts.forEach((cart) => {
      if (cart.id == cart_id) {
        found = true;
        knex("cart")
          .where({
            id: cart_id,
          })
          .update({
            status: data.status,
          })
          .then(() => {
            res.send({
              msg: "carrinho atualizado",
            });
          });
      }
    });
    if (!found) {
      res.send({
        error: true,
        msg: "carrinho nao encontrado",
      });
    }
  }
});

app.get("/cart-products/:id", async (req, res, _next) => {
  var token = req.headers.token;
  var cart_id = req.params.id;

  const authentications = await knex
    .select("user_id")
    .from("authentications")
    .where({
      token: token,
    });

  if (!authentications[0]) {
    res.send({
      error: true,
      msg: "token invalido",
    });
    return;
  } else {
    var user_id = authentications[0].user_id;
    var found = false;
    const carts = await knex.select("*").from("cart").where({
      user_id: user_id,
    });
    carts.forEach((cart) => {
      if (cart.id == cart_id) {
        found = true;
        knex
          .select("*")
          .from("cart-products")
          .where({ cart_id: cart_id })
          .then((response) => {
            var products: any = [];
            Promise.all(
              response.map(async (item) => {
                await knex
                  .select("*")
                  .from("products")
                  .where({ id: item.product_id })
                  .then((details) => {
                    products.push({
                      item,
                      details: details[0],
                    });
                  });
              })
            ).then(() => {
              res.send({
                products: products,
              });
            });
          });
      }
    });
    if (!found) {
      res.send({
        error: true,
        msg: "carrinho nao encontrado",
      });
    }
  }
});

app.post("/cart-products/:id", async (req, res, _next) => {
  var token = req.headers.token;
  var cart_id = req.params.id;
  var data = req.body;

  if (!data.product_id || !data.quantity) {
    res.send({
      error: true,
      msg: "campos obrigatorios nao preenchidos",
    });
    return;
  }

  const authentications = await knex
    .select("user_id")
    .from("authentications")
    .where({
      token: token,
    });

  if (!authentications[0]) {
    res.send({
      error: true,
      msg: "token invalido",
    });
    return;
  } else {
    var user_id = authentications[0].user_id;
    var found = false;
    const carts = await knex.select("*").from("cart").where({
      user_id: user_id,
    });
    carts.forEach((cart) => {
      if (cart.id == cart_id) {
        found = true;

        knex
          .select("*")
          .from("products")
          .where({
            id: data.product_id,
          })
          .then(async (product) => {
            var total_price = product[0].price * data.quantity;
            var cartProduct = await knex
              .select("*")
              .from("cart-products")
              .where({
                cart_id: cart_id,
                product_id: data.product_id
              });
            if (cartProduct[0]) {
              knex("cart-products")
                .where({
                  cart_id: cart_id,
                  product_id: data.product_id
                })
                .update({
                  quantity: data.quantity,
                  unity_price: product[0].price,
                  total_price: total_price,
                }).then(() => {
                  res.send({
                    msg: "produto atualizado no carrinho",
                  });
                });
            } else {
              knex("cart-products")
                .insert({
                  cart_id: cart_id,
                  product_id: data.product_id,
                  quantity: data.quantity,
                  unity_price: product[0].price,
                  total_price: total_price,
                })
                .then(() => {
                  res.send({
                    msg: "produto adicionado ao carrinho",
                  });
                });
            }
          });
      }
    });
    if (!found) {
      res.send({
        error: true,
        msg: "carrinho nao encontrado",
      });
    }
  }
});

app.delete("/cart-products/:id", async (req, res, _next) => {
  var token = req.headers.token;
  var cart_id = req.params.id;
  var data = req.body;

  if (!data.product_id) {
    res.send({
      error: true,
      msg: "campos obrigatorios nao preenchidos",
    });
    return;
  }

  const authentications = await knex
    .select("user_id")
    .from("authentications")
    .where({
      token: token,
    });

  if (!authentications[0]) {
    res.send({
      error: true,
      msg: "token invalido",
    });
    return;
  } else {
    var user_id = authentications[0].user_id;
    var found = false;
    const carts = await knex.select("*").from("cart").where({
      user_id: user_id,
    });
    carts.forEach((cart) => {
      if (cart.id == cart_id) {
        found = true;
        knex('cart-products').where({
          cart_id: cart_id,
          product_id: data.product_id
        }).del()
        .then(() => {
          res.send({
            msg: "produto removido do carrinho com sucesso"
          })
        })
      }
    });
    if (!found) {
      res.send({
        error: true,
        msg: "carrinho nao encontrado",
      });
    }
  }
});

app.use((_req, res) => {
  res.status(404);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando com sucesso ${HOSTNAME}:${PORT}`);
});
