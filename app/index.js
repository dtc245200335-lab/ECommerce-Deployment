
const express = require("express");
const session = require("express-session");
const db = require("./db");
const app = express();
const PORT = process.env.PORT || 4000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.use(session({
    name: "ecommerce.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }
}));


// Trang chủ website thương mại điện tử
app.get("/", async (req, res) => {
    try {
        const [products] = await db.query(
            `SELECT id, name, description, price, stock
             FROM products
             WHERE is_active = 1
             ORDER BY id`
        );

        res.render("index", { products });
    } catch (error) {
        console.error("Error loading products:", error.message);

        res.status(500).send("Khong the tai san pham");
    }
});
// Endpoint kiểm tra trạng thái server
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.get("/api/products", async (req, res) => {
    try {
        const [products] = await db.query(
            `SELECT id, name, description, price, stock
             FROM products
             WHERE is_active = 1
             ORDER BY id`
        );

        res.json(products);
    } catch (error) {
        console.error("Database query failed:", error.message);

        res.status(500).json({
            error: "Khong the lay danh sach san pham"
        });
    }
});


app.post("/cart/add", async (req, res) => {
    const productId = Number(req.body.productId);

    if (!Number.isSafeInteger(productId) || productId <= 0) {
        return res.status(400).send("San pham khong hop le");
    }

    try {
        const [rows] = await db.query(
            `SELECT id, stock FROM products
             WHERE id = ? AND is_active = 1`,
            [productId]
        );

        if (rows.length === 0) {
            return res.status(404).send("Khong tim thay san pham");
        }

        const product = rows[0];
        const cart = req.session.cart || [];
        const existing = cart.find(
            item => item.productId === productId
        );

        if ((existing?.quantity || 0) >= product.stock) {
            return res.status(400).send("San pham da het hang");
        }

        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ productId, quantity: 1 });
        }

        req.session.cart = cart;

        req.session.save(error => {
            if (error) {
                console.error(error);
                return res.status(500).send("Loi luu gio hang");
            }

            res.redirect("/cart");
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Loi them san pham");
    }
});

// Tạm hiển thị dữ liệu giỏ hàng để kiểm tra

app.get("/cart", async (req, res) => {
    try {
        const cart = req.session.cart || [];

        if (cart.length === 0) {
            return res.render("cart", {
                items: [],
                total: 0
            });
        }

        const ids = cart.map(item => item.productId);
        const placeholders = ids.map(() => "?").join(",");

        const [products] = await db.query(
            `SELECT id, name, price, stock
             FROM products
             WHERE id IN (${placeholders})`,
            ids
        );

        const items = products.map(product => {
            const cartItem = cart.find(
                item => item.productId === product.id
            );

            const quantity = cartItem.quantity;
            const subtotal = Number(product.price) * quantity;

            return {
                ...product,
                quantity,
                subtotal
            };
        });

        const total = items.reduce(
            (sum, item) => sum + item.subtotal,
            0
        );

        res.render("cart", { items, total });
    } catch (error) {
        console.error("Cart error:", error.message);
        res.status(500).send("Khong the tai gio hang");
    }
});


app.post("/cart/update", async (req, res) => {
    const productId = Number(req.body.productId);
    const quantity = Number(req.body.quantity);

    if (!Number.isSafeInteger(productId) || productId <= 0 ||
        !Number.isSafeInteger(quantity) || quantity < 1) {
        return res.status(400).send("So luong khong hop le");
    }

    try {
        const [products] = await db.query(
            `SELECT stock FROM products
             WHERE id = ? AND is_active = 1`,
            [productId]
        );

        if (products.length === 0 || quantity > products[0].stock) {
            return res.status(400).send("So luong vuot qua ton kho");
        }

        const cart = req.session.cart || [];
        const item = cart.find(p => p.productId === productId);

        if (!item) {
            return res.status(404).send("San pham khong co trong gio");
        }

        item.quantity = quantity;

        req.session.save(error => {
            if (error) {
                return res.status(500).send("Loi cap nhat gio hang");
            }
            res.redirect("/cart");
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Loi cap nhat gio hang");
    }
});


app.post("/cart/remove", (req, res) => {
    const productId = Number(req.body.productId);

    if (!Number.isSafeInteger(productId) || productId <= 0) {
        return res.status(400).send("San pham khong hop le");
    }

    const cart = req.session.cart || [];

    req.session.cart = cart.filter(
        item => item.productId !== productId
    );

    req.session.save(error => {
        if (error) {
            console.error("Cart remove error:", error.message);
            return res.status(500).send("Loi xoa san pham");
        }

        res.redirect("/cart");
    });
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
