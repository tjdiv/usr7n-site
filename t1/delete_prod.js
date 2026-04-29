const firebase = require('firebase/app');
require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBB4CfmM4r_Z8rkbGdz5AwrOqSv6rX6twg",
  authDomain: "bayn-35bfc.firebaseapp.com",
  projectId: "bayn-35bfc",
  storageBucket: "bayn-35bfc.firebasestorage.app",
  messagingSenderId: "807550594027",
  appId: "1:807550594027:web:2df73db12b872b76ee47ae"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

async function deleteCoffee() {
    try {
        const snapshot = await db.collection("products").where("name", "==", "القهوه").get();
        if (snapshot.empty) {
            const snapshot2 = await db.collection("products").where("name", "==", "قهوه").get();
            snapshot2.forEach(async (doc) => {
                await doc.ref.delete();
                console.log("Deleted product: " + doc.data().name);
            });
        } else {
            snapshot.forEach(async (doc) => {
                await doc.ref.delete();
                console.log("Deleted product: " + doc.data().name);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

deleteCoffee();
