if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', ready)
} else {
    ready()
}

function ready() {
    var removeCartItemButtons = document.getElementsByClassName('btn-danger')
    for (var i = 0; i < removeCartItemButtons.length; i++) {
        var button = removeCartItemButtons[i]
        button.addEventListener('click', removeCartItem)
    }

    var quantityInputs = document.getElementsByClassName('cart-quantity-input')
    for (var i = 0; i < quantityInputs.length; i++) {
        var input = quantityInputs[i]
        input.addEventListener('change', quantityChanged)
    }

    var addToCartButtons = document.getElementsByClassName('shop-item-button')
    for (var i = 0; i < addToCartButtons.length; i++) {
        var button = addToCartButtons[i]
        button.addEventListener('click', addToCartClicked)
    }

    document.getElementsByClassName('btn-purchase')[0].addEventListener('click', purchaseClicked)
}

function purchaseClicked() {
    alert('Thank you for your purchase')
    var cartItems = document.getElementsByClassName('cart-items')[0]
    while (cartItems.hasChildNodes()) {
        cartItems.removeChild(cartItems.firstChild)
    }
    updateCartTotal()
}

function removeCartItem(event) {
    var buttonClicked = event.target
    buttonClicked.parentElement.parentElement.remove()
    updateCartTotal()
}

function quantityChanged(event) {
    var input = event.target
    if (isNaN(input.value) || input.value <= 0) {
        input.value = 1
    }
    updateCartTotal()
}

function addToCartClicked(event) {
    var button = event.target
    var shopItem = button.parentElement.parentElement
    var title = shopItem.getElementsByClassName('shop-item-title')[0].innerText
    var price = shopItem.getElementsByClassName('shop-item-price')[0].innerText
    var imageSrc = shopItem.getElementsByClassName('shop-item-image')[0].src
    addItemToCart(title, price, imageSrc)
    updateCartTotal()
}

function addItemToCart(title, price, imageSrc) {
    var cartRow = document.createElement('div')
    cartRow.classList.add('cart-row')
    var cartItems = document.getElementsByClassName('cart-items')[0]
    var cartItemNames = cartItems.getElementsByClassName('cart-item-title')
    for (var i = 0; i < cartItemNames.length; i++) {
        if (cartItemNames[i].innerText == title) {
            alert('This item is already added to the cart')
            return
        }
    }
    var cartRowContents = `
        <div class="cart-item cart-column">
            <img class="cart-item-image" src="${imageSrc}" width="100" height="100">
            <span class="cart-item-title">${title}</span>
        </div>
        <span class="cart-price cart-column">${price}</span>
        <div class="cart-quantity cart-column">
            <input class="cart-quantity-input" type="number" value="1">
            <button class="btn btn-danger" type="button">REMOVE</button>
        </div>`
    cartRow.innerHTML = cartRowContents
    cartItems.append(cartRow)
    cartRow.getElementsByClassName('btn-danger')[0].addEventListener('click', removeCartItem)
    cartRow.getElementsByClassName('cart-quantity-input')[0].addEventListener('change', quantityChanged)
}

function updateCartTotal() {
    var cartItemContainer = document.getElementsByClassName('cart-items')[0]
    var cartRows = cartItemContainer.getElementsByClassName('cart-row')
    var total = 0
    for (var i = 0; i < cartRows.length; i++) {
        var cartRow = cartRows[i]
        var priceElement = cartRow.getElementsByClassName('cart-price')[0]
        var quantityElement = cartRow.getElementsByClassName('cart-quantity-input')[0]
        var price = parseFloat(priceElement.innerText.replace('$', ''))
        var quantity = quantityElement.value
        total = total + (price * quantity)
    }
    total = Math.round(total * 100) / 100
    document.getElementsByClassName('cart-total-price')[0].innerText = total + ' Bath'
}

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const ejs = require("ejs");
var _ = require('lodash');
const { MongoClient } = require("mongodb");
const console = require("console");
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())
app.use(express.static("public"));
app.use(express.static(__dirname + './public/script.js'));
const client = new MongoClient('mongodb+srv://BLT:Milk%40081@restaurant.ftxwd.mongodb.net/Restaurant?retryWrites=true&w=majority');
var loggedIn = {};
var orderNo = 0;

app.get("/", async function (req, res) {
    await client.connect()
    const list = [];
    try {
        const db = client.db('Restaurant').collection('Order');
        const data = await db.find().forEach(function (obj) {
            list.push(obj);
        })
        list.sort((firstEl, secondEl) => { return secondEl.order - firstEl.order })
        orderNo = list[0].order;
    } catch (err) {
        orderNo = 0;
    }
    res.render('list.ejs', { orderList: list });
})

app.get("/kitchen", async function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const list = [];
    try {
        const db = client.db('Restaurant').collection('Order');
        const data = await db.find( /*{ "pen": "paper" } simulate 0 result*/).forEach(function (obj) {
            list.push(obj);
        })
        list.sort((firstEl, secondEl) => { return secondEl.order - firstEl.order })
        orderNo = list[0].order;
    } catch (err) {
        orderNo = -1;
    }
    res.render('kitchen.ejs', { isLoggedIn: Object.keys(loggedIn).includes(ip), name: loggedIn[ip], orderList: list });
})
app.post("/login", async function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    await client.connect()
    const db = client.db('Restaurant').collection('User');
    var resBody = {
        status: "success",
        data: {}
    };
    try {
        const user = req.body["value"]
        if (user["Username"].length > 0 && user["Password"].length > 0) {
            const data = await db.findOne({ "Username": user["Username"] });
            if (data !== null) {
                if (data["Password"] === user["Password"]) {
                    loggedIn[ip] = user["Username"];
                    console.log(`${ip} logged in.`);
                } else resBody["status"] = "error";
            } else resBody["status"] = "error";
        } else resBody["status"] = "error";
    } catch (err) {
        resBody["status"] = "error";
    }
    res.json(resBody);
})

app.post("/logout", async function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    var resBody = {
        status: "success",
        data: {}
    };
    delete loggedIn[ip]
    console.log(`${ip} logged out.`)
    res.json(resBody);
})

app.post("/submit", async function(req, res) {
    await client.connect()
    const db = client.db('Restaurant').collection('Order');
    var resBody = {
        status: "success",
        data: {}
    };
    try {
        if (orderNo === -1) {
            try {
                const list = [];
                const data = await db.find().forEach(function(obj) {
                    list.push(obj);
                })
                list.sort((firstEl, secondEl) => { return secondEl.order - firstEl.order })
                orderNo = list[0].order;
            } catch (err) {
                orderNo = 1
            }
        }
        const order = req.body["out"]
        order["order"] = ++orderNo;
        await db.insertOne(order);
    } catch (err) {
        resBody["status"] = "error";
    }
    res.json(resBody);
})

app.post("/checkout", async function (req, res) {
    await client.connect()
    const db = client.db('Restaurant').collection('Order');
    var resBody = {
        status: "success",
        data: {}
    };
    try {
        db.drop();
        client.db('Restaurant').createCollection('Order');
        console.log("remove success");
    } catch (err) {
        resBody["status"] = "error";
    }
    res.json(resBody);
    res.render('list.ejs');
})

app.post("/changeStatus", async function (req, res) {
    await client.connect()
    const db = client.db('Restaurant').collection('Order');
    var resBody = {
        status: "success",
        data: {}
    };
    console.log(req.body);
    try {
        const order = req.body["out"]
        await db.updateOne({ "order": order["order"] }, { $set: { status: order["status"] } })
    } catch (err) {
        resBody["status"] = "error";
    }
    res.json(resBody);
})

app.post("/cancel", async function(req, res) {
    await client.connect()
    const db = client.db('Restaurant').collection('Order');
    var resBody = {
        status: "success",
        data: {}
    };
    try {
        const order = req.body["out"]
        await db.deleteOne({ "order": order["order"] })
    } catch (err) {
        resBody["status"] = "error";
    }
    res.json(resBody);
})

app.listen('3000', function () {
    console.log("server start at port 3000")
})

document.getElementById('submit').disabled = true;
var foodList = [];
var quanti = document.getElementById("foodQt").children[1].innerText;
var Fname, request, qt;
var orderID = 0;
var price = 0;

$(".mod").click(function(){
    $('.modal').modal('show');
});


function showModal(foodId) {
    food = document.getElementById(foodId);
    real = false;
    quanti = 0;
    index = -1;
    if (foodList.map(x => x[0]).includes(food.children[0].innerText)) {
        real = true;
        index = foodList.map(x => x[0]).indexOf(food.children[0].innerText);
        quanti = foodList[index][2]
    }
    document.getElementById("message-text").value = "";
    document.getElementById("modLabel").innerText = food.children[0].innerText;
    document.getElementById("foodDescript").innerText = food.children[2].children[0].children[0].innerText
    document.getElementById("message-text").value = real ? foodList[index][1] : "";
    document.getElementById("foodQt").children[1].innerText = real ? quanti : 0;
    document.getElementById("sub").disabled = quanti === 0 ? true : false;
    price = food.children[1].children[0].innerHTML.replace("฿", "");
    console.log(price);
}

function addition() {
    quanti++;
    document.getElementById("foodQt").children[1].innerText = quanti;
    document.getElementById("sub").disabled = false;
}

function substract() {
    quanti--;
    document.getElementById("foodQt").children[1].innerText = quanti;
    if (document.getElementById("foodQt").children[1].innerText == 0) {
        document.getElementById("sub").disabled = true;
    }
}

function closeMod() {
    $('.modal').modal('hide');
}

async function submit(){
    let tableNum = document.getElementById('sel-number').value;
    if(document.getElementById("foodQt").children[1].innerText != 0){
        orderID++;
        Fname = document.getElementById("modLabel").innerText;
        request = document.getElementById("message-text").value;
        qt = document.getElementById("foodQt").children[1].innerText;
        foodList.push(['order'+orderID, tableNum, Fname, request, qt, price, qt*price])
        addOrder(orderID, Fname, request, qt);
        document.getElementById('submit').disabled = false; 
    }
    for(let i = 0; i < foodList.length; i++){
        console.log(foodList[i]);
    }
    $('.modal').modal('hide');
}

function searchFood() {
    var input, filter, list, a;
    input = document.getElementById("searchBar");
    filter = input.value.toUpperCase();
    list = document.getElementsByClassName("row mod");
    console.log(list.length);
    for (let i = 0; i < list.length; i++) {
        a = list[i].children[0].children[0].innerHTML;
        if (a.toUpperCase().indexOf(filter) > -1) {
            list[i].style.display = "";
        } else {
            list[i].style.display = "none"
        }
    }
}

function addOrder(Id, name, request, qt){
    
    let orderBox = document.createElement("div");orderBox.className="orderList";
    let orderRow = document.createElement("div");orderRow.className="row";    
    let orderNameBox = document.createElement("div");orderNameBox.className="foodOr col-10 col-sm-10";
    let orderName = document.createElement("h2");orderName.innerHTML=name;
    let deleteButtonBox = document.createElement("div");deleteButtonBox.className="deleteOrder col-2 col-sm-2";
    let deleteButton = document.createElement("h2");deleteButton.setAttribute('id','order'+Id);deleteButton.setAttribute('role','button');deleteButton.setAttribute('onclick','deleteOrder(this.id)');deleteButton.innerHTML = '-';
    let requestRow = document.createElement("div");requestRow.className="row";
    let requestBox = document.createElement("div");requestBox.className="request col-10 col-sm-10";
    let requestMessage = document.createElement("h5");requestMessage.innerHTML=request;
    let qtBox = document.createElement("div");qtBox.className="qt col-2 col-sm-2";
    let qtTxt = document.createElement("h3");qtTxt.innerHTML=qt;qtTxt.className="qt";
    
    orderNameBox.appendChild(orderName);deleteButtonBox.appendChild(deleteButton);
    orderRow.appendChild(orderNameBox);orderRow.appendChild(deleteButtonBox);
    orderBox.appendChild(orderRow);
    requestBox.appendChild(requestMessage);qtBox.appendChild(qtTxt);
    requestRow.appendChild(requestBox);requestRow.appendChild(qtBox);
    orderBox.appendChild(requestRow);

    document.getElementById("orderRow").prepend(orderBox);
}
function checkSubmit(){
    if(foodList.length < 1){
        document.getElementById('submit').disabled = true;
    } else {
        document.getElementById('submit').disabled = false;
    }
}
function deleteOrder(orderID){
    console.log(orderID)
    if(confirm('Do you want to remove this order?') == true){
        document.getElementById(orderID).parentNode.parentNode.parentNode.remove();
        for (let i = 0; i < foodList.length; i++) {
            if(foodList[i][0] == orderID){
                foodList.splice(i,1)
            }
        } 
    }
    checkSubmit();
}

async function pushToDatabase(event) {
    event.preventDefault();
    var out2 = []
    foodList.forEach(element => {
        var temp = {
            name: element[2],
            quantity: element[4],
            note: element[3],
            price: element[5],
            total: element[6]
        }
        out2.push(temp)
    });
    var out = {
        order: -1,
        table: parseInt(document.getElementById('sel-number').options[document.getElementById('sel-number').selectedIndex].value),
        status: "Queue",
        foodList: out2
    }
    try {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/submit");
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = function() {
            var response = JSON.parse(xhr.response);
            if (response["status"] === "success") {
                foodlist = [];
                document.getElementById("orderRow").innerHTML = '';
                window.location.replace("/");
            } else {
                alert("epic fail")
            }
        };
        xhr.send(JSON.stringify({ out }));
    } catch (err) {
        alert(err)
    }
}
async function changeStatus(order, status) {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", `/changeStatus`);
        out = { "order": order, "status": status }
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = function() {
            var response = JSON.parse(xhr.response);
            if (response["status"] === "success") {
                console.log("ok");
            } else {
                alert("epic fail")
            }
        };
        xhr.send(JSON.stringify({ out }));
    } catch (err) {
        alert(err)
    }
}

async function cancel(order) {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", `/cancel`);
        out = { "order": order }
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = function() {
            var response = JSON.parse(xhr.response);
            if (response["status"] === "success") {
                window.location.replace("/");
            } else {
                alert("epic fail")
            }
        };
        xhr.send(JSON.stringify({ out }));
    } catch (err) {
        alert(err)
    }
}
document.getElementById('submission-form').addEventListener('submit', pushToDatabase);

