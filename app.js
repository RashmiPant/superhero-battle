const axios = require("axios");
const { MongoClient } = require("mongodb");
const router = require("express").Router();

const getHeroStats = (hero, stats) => {
    return new Promise(async (resolve, reject) => {
        try {
            let stat = { name: hero };
            const heroData = await axios.get("https://superhero-search.p.rapidapi.com/", {
                params: { hero },
                headers: {
                    "x-rapidapi-key": "f502cf9d0fmshb5acda307dd9a32p17a02ajsn3dcda984efaf",
                    "x-rapidapi-host": "superhero-search.p.rapidapi.com",
                    "useQueryString": true
                }
            })
            stat["birthPlace"] = heroData.data.biography.placeOfBirth;
            stat["ranker"] = heroData.data.powerstats.intelligence;
            stats.push(stat);
            resolve(true);
        } catch (error) {
            console.log(error);
            reject("Error in getting complete superHero data. Check the names again!!");
        }
    })
}

const getData = (hero, rank) => {
    return new Promise(async (resolve, reject) => {
        try {
            const weather = await axios.get("https://weatherapi-com.p.rapidapi.com/forecast.json", {
                params: { q: hero.birthPlace },
                headers: {
                    "x-rapidapi-key": "f502cf9d0fmshb5acda307dd9a32p17a02ajsn3dcda984efaf",
                    "x-rapidapi-host": "weatherapi-com.p.rapidapi.com",
                    "useQueryString": true
                }
            });
            hero["currentWeatherCelsius"] = weather.data.current.temp_c;
            const city = await axios.get("https://developers.zomato.com/api/v2.1/cities", {
                params: {
                    q: hero.birthPlace,
                    count: 1
                },
                headers: { "user-key": "8ac6287c09990a279de7812479923d2f" }
            });
            if (city.data.location_suggestions.length != 0) {
                const restaurant = await axios.get("https://developers.zomato.com/api/v2.1//search", {
                    params: {
                        entity_id: city.data.location_suggestions[0].id,
                        entity_type: "city",
                        count: 1
                    },
                    headers: { "user-key": "8ac6287c09990a279de7812479923d2f" }
                })
                hero["restaurant"] = { name: restaurant.data.restaurants[0].restaurant.name, rating: restaurant.data.restaurants[0].restaurant.user_rating.aggregate_rating };
            }
            delete hero.ranker;
            hero["rank"] = rank + 1;
            resolve(true);
        } catch (error) {
            console.log(error);
            console.log("Error while fetching the weather and restaurant details. Winners are still declared")
            reject(error);
        }
    })
}

const saveWinners = (winners) => {
    try {
        const url = "mongodb://localhost:27017/superhero-battle";
        MongoClient.connect(url, { useUnifiedTopology: true }, (err, db) => {
            if (err) throw err;
            db.db("superhero-battle").collection("winnerHeros").insertOne({ result: winners }, (err, res) => {
                if (err) throw err;
                db.close();
            });
        });
    } catch (error) {
        throw (error);
    }
}

router.post("/", async (req, res) => {
    try {
        if (req.body.heroes.length < 3 || req.body.heroes.length > 10) res.json("Only 3 to 10 superheros can compete");
        else {
            let stats = [];
            await Promise.all(req.body.heroes.map(hero => getHeroStats(hero, stats)));
            let winners = stats.sort((a, b) => b.ranker - a.ranker).slice(0, 3);
            await Promise.allSettled(winners.map((hero, rank) => getData(hero, rank)));
            saveWinners(winners);
            res.json(winners);
        }
    } catch (error) {
        console.log(error)
        res.status(500).send(error);
    }
});

module.exports = router;