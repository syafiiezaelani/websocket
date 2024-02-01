import { pricingService, stockListService } from "./api.js";
import { WebSocketServer } from "ws";
import { WebsocketRequestTypes, WebsocketResponseTypes, ComponentTypes } from "./enum.js";

const wss = new WebSocketServer({port: 8082})


wss.on("connection", (ws, rq) => {
    console.log("new client connected, client ip address: ",rq.socket.remoteAddress)

    ws.on('open', () => {
        console.log("Server on open: ",stockListService());
      });

    ws.on("close", ()=>{
        console.log("client has disconnected. ")
    })

    ws.on("message", (data) => {// when there is a message, we are doing this.
        const response = handleMessageReceived(data);
    })

    const pricingIntervalArray = [];
    /* pricingIntervalArray {
        stockTicker: xxx,
        pricingInterval: xxx
    }
    \*/

    const handleMessageReceived = (data) => {
        const dataParsed = JSON.parse(data);
        console.log("message from client received: ", dataParsed); 
        let returnObject = {
            type: dataParsed.type,// Request type
            value: null // Default would be null.
        }

        switch(dataParsed.type){
            case WebsocketRequestTypes.START: // Runs once at the start, persisted in redux
                returnObject.type = WebsocketResponseTypes.START_RESPONSE;
                stockListService().then((stocksList) => {
                    if(stocksList && stocksList.length > 0){
                        returnObject.value = [...stocksList];
                    }
                    ws.send(JSON.stringify(returnObject));
                    console.log("request handler", returnObject)
                })
                break;
                
            case WebsocketRequestTypes.PRICING_REQUEST: // For pricing the dataParsed value there are 2 children in the object: selectedPriceString & componentType
                pricingService(dataParsed.value.selectedPriceString, dataParsed.value.componentType).then((openValuesArray) => {
                    if(openValuesArray && openValuesArray.length > 0){
                        if(dataParsed.value.componentType === ComponentTypes.TILE){
                            returnObject.type = WebsocketResponseTypes.TILE_PRICING_RESPONSE;
                            const pricingInterval = setInterval(() => {
                                const index = getRandomIndex(openValuesArray);
                                returnObject.value = {
                                    stockTicker: dataParsed.value.selectedPriceString,
                                    price: openValuesArray[index]
                                };
                                ws.send(JSON.stringify(returnObject))
                                console.log(returnObject.type, returnObject.value)
                            }, 1000);

                            pricingIntervalArray.push({
                                stockTicker: dataParsed.value.selectedPriceString,
                                pricingInterval: pricingInterval
                            })
                        }else if(dataParsed.value.componentType === ComponentTypes.CHART){
                            returnObject.type = WebsocketResponseTypes.CHART_PRICING_RESPONSE;
                            returnObject.value = {
                                stockTicker: dataParsed.value.selectedPriceString,
                                prices: openValuesArray
                            }
                            console.log(returnObject.type, returnObject.value)
                            ws.send(JSON.stringify(returnObject));
                        }
                    }
                })
                break;

            case WebsocketRequestTypes.COMPONENT_CLOSE:
                returnObject.type = WebsocketResponseTypes.COMPONENT_CLOSE_RESPONSE;
                if(pricingIntervalArray.length > 0){
                    pricingIntervalArray.forEach(pricingInterval => {
                        if(pricingInterval.stockTicker === dataParsed.value){
                            console.log("Running response to component close, closing this subscription: ", dataParsed.value)
                            clearInterval(pricingInterval.pricingInterval);
                        }
                    })
                }else{
                    console.log("Closing compoenent with no side effects")
                }
            }
    }
})

const getRandomIndex = (pricesArray) => {
    return Math.floor(Math.random() * pricesArray.length);
}