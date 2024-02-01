// const axios = require('axios');
import axios from "axios";

// TODO: Update with own api keys
const REACT_APP_ALPHA_KEY = ''
const REACT_APP_MBOUM_KEY = ''


export async function stockListService() {

    const options = {
        method: 'GET',
        url: 'https://mboum-finance.p.rapidapi.com/tr/trending',
        headers: {
            'X-RapidAPI-Key': `${REACT_APP_MBOUM_KEY}`,// TODO: Figure out how to hid API before pushing to git, can also choose to ignore but just find out how to hide it in the first place.
            'X-RapidAPI-Host': 'mboum-finance.p.rapidapi.com'
        }
    };
    
    try {
        const response = await axios.request(options);
        return response.data.body;
    } catch (error) {
        console.error(error);
    }
}

export const pricingService = async(selectedTickerString, componentTypeString) => {
    console.log("pricing service", selectedTickerString, componentTypeString)
    const options = {
        method: 'GET',
        url: 'https://alpha-vantage.p.rapidapi.com/query',
        params: {
            interval: '5min',
            function: 'TIME_SERIES_INTRADAY',
            symbol: `${selectedTickerString}`,
            datatype: 'json',
            output_size: 'compact'
        },
        headers: {
            'X-RapidAPI-Key': REACT_APP_ALPHA_KEY,
            'X-RapidAPI-Host': 'alpha-vantage.p.rapidapi.com'
        }
    };
    
    try {
        const response = await axios.request(options);
        const pricingObjects = response.data["Time Series (5min)"];
        const openValues = tileAndChartPricingDataProcessing(componentTypeString, pricingObjects);
        
        console.log("tile pricing service running", openValues);
    return openValues;
    } catch (error) {
        console.error(error);
    }
}

// Tile and Chart take data from same source, difference is that chart requires data all at once while tile there is a delay/interval in the data sent. 
const tileAndChartPricingDataProcessing = (componentTypeString, pricingObjects) => {
    let openValues = [];

    if(componentTypeString === "TILE"){
        for (const timestamp in pricingObjects) {
            const stringTime = timestamp.toString();
            const value = pricingObjects[stringTime]["1. open"];
            const editedValue = value.slice(0, value.length - 2)// TODO: Use regex to do it instead of this, cause there is a chance that this would fail. 
            openValues.push(editedValue);
        }
    } else if(componentTypeString === "CHART"){
        const regex = new RegExp("..:..");// TODO: For now this works, figure out a better way to do this.

        for (const timestamp in pricingObjects) {
            const stringTime = timestamp.toString();
            const time = regex.exec(stringTime);
            const newObject = {
                price: pricingObjects[stringTime]["1. open"],
                time: time
            }
            openValues.push(newObject);
        }
    }

    return openValues;
}

