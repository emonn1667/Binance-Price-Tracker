const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'BNBUSDT'];
const apiUrl = 'https://api.binance.com/api/v3/ticker/24hr?symbol=';

async function fetchPrices() {
    const container = document.getElementById('prices');
    container.innerHTML = '';

    for (const symbol of symbols) {
        try {
            const response = await fetch(apiUrl + symbol);
            const data = await response.json();

            const price = parseFloat(data.lastPrice).toFixed(2);
            const change = parseFloat(data.priceChangePercent).toFixed(2);
            const changeClass = change >= 0 ? 'text-green-600' : 'text-red-600';

            const card = document.createElement('div');
            card.className =
                "bg-white p-5 rounded-lg shadow-xl min-w-[160px]";

            card.innerHTML = `
                <h3 class="text-xl font-semibold mb-2">${symbol.replace('USDT', '')}/USDT</h3>
                <div class="text-2xl font-bold text-blue-600">$${price}</div>
                <div class="mt-2 text-lg font-medium ${changeClass}">${change}%</div>
            `;

            container.appendChild(card);

        } catch (error) {
            console.error('Error fetching data for', symbol, error);
        }
    }
}

fetchPrices();
setInterval(fetchPrices, 5000);
