const API_KEY = "";
let selectedCityText;
let selectedCity;

const DAYS_OF_THE_WEEK = ["sun","mon","tue","wed","thr","fri","sat"];

const getCurrentWeatherStatus = async({lat,lon, name: city }) => {
    const url = lat && lon ?`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`:`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
    const response = await fetch (url);
    return response.json();
}

const formatTemp = (temp) => `${temp?.toFixed(1)}°`
const getIcon = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`


const loadCurrentForecast = ({main:{temp, temp_max, temp_min},name: city , weather: [{description}]}) => {
    const currentForcastElement = document.querySelector('#current-forecast');
    currentForcastElement.querySelector(".city").textContent = city;
    currentForcastElement.querySelector(".temp").textContent = formatTemp(temp);
    currentForcastElement.querySelector(".description").textContent = description;
    currentForcastElement.querySelector(".min-max-temp").textContent = `H: ${formatTemp(temp_max)} L: ${formatTemp(temp_min)}`;
}

const getHourlyForcast = async({name:city}) => {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json();
    return data.list.map(forecast => {
        const { main: {temp, temp_max, temp_min}, dt, dt_txt, weather: [{description,icon}]} = forecast;
        return { temp, temp_max, temp_min, dt, dt_txt,description,icon };
    })

}

const getCitiesUsingGeoLocation = async(searchText) => {
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`)
    return response.json();
}

const loadHourlyForecast = ({main:{temp: tempNow}, weather:[{icon:iconNow}]},hourlyWeather) => {
    let dataFor12Hours = hourlyWeather.slice(2,14);
    const hourlyContainer = document.querySelector(".hourly-container");

    const formatTime =  Intl.DateTimeFormat("en",
        { 
          hour12: true, 
          hour:"numeric"
            }
        )

    let innerHtmlString = `<article>
    <h3 class = 'time'>${"Now"}</h3>
    <img class= "icon" src="${getIcon(iconNow)}" alt="Image Load Failed"/>
    <p class = " hourly-temp">${formatTemp(tempNow)}</p>
    </article>`;

    for(let {temp,icon,dt_txt} of dataFor12Hours){
        innerHtmlString += 
        `<article>
        <h3 class = 'time'>${formatTime.format(new Date(dt_txt))}</h3>
        <img class= "icon" src="${getIcon(icon)}" alt="Image Load Failed"/>
        <p class = " hourly-temp">${formatTemp(temp)}</p>
        </article>
        `;
    }

    hourlyContainer.innerHTML = innerHtmlString;

}

const calculateDaywise = (hourlyForecast) => {

    let dayWiseForecast = new Map();

    for(let forecast of hourlyForecast)
    {
        const [date] = forecast.dt_txt.split(" ");
        const dayOfTheWeek = DAYS_OF_THE_WEEK[new Date(date).getDay()];
        if(dayWiseForecast.has(dayOfTheWeek))
        {
            let forecastOfTheDay = dayWiseForecast.get(dayOfTheWeek);
            forecastOfTheDay.push(forecast);
            dayWiseForecast.set(dayOfTheWeek,forecastOfTheDay);
        }
        else{
            dayWiseForecast.set(dayOfTheWeek,[forecast]);
        }
    }

    for([key,value] of dayWiseForecast)
    {
        let temp_min = Math.min(...Array.from(value, val => val.temp_min));
        let temp_max = Math.max(...Array.from(value, val => val.temp_max));

        dayWiseForecast.set(key,{temp_min,temp_max,icon: value.find(v => v.icon).icon});

    }

    return dayWiseForecast;

}

const loadDayWiseForecast = (hourlyForecast) => {
    const dayWiseForecast = calculateDaywise(hourlyForecast);
    const container = document.querySelector(".five-day-forecast-container");
    let dayWiseInfo = "";
    Array.from(dayWiseForecast).map(([day,{temp_min,temp_max,icon}],index) => {
        if(index<5)
        {
            dayWiseInfo += `
            <article class="day-wise-forecast">
                <h3 class="day">${index === 0? "Today" : day}</h3>
                <img class="icon" src="${getIcon(icon)}" alt="Error"/>
                <p class = "min-temp">${formatTemp(temp_min)}</p>
                <p class = "max-temp">${formatTemp(temp_max)}</p>
            </article>
                    `
        }
    });
    container.innerHTML = dayWiseInfo;
}

const loadFeelLike = ({main: {feels_like}}) => {
    const container =   document.querySelector('#feel-like');
    container.querySelector(".feel-like-temp").textContent = formatTemp(feels_like);
}

const loadHumidity = ({main: {humidity}}) => {
    const container = document.querySelector("#humidity");
    container.querySelector(".humidity-value").textContent = `${humidity} %`;
}

function debounce (fn){
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this,args);
         },500);
    }
}

const onSearchChange = async(event) => {
    const { value } = event.target;
    if(!value)
    {
        selectedCity=null;
        selectedCityText="";
    }
    if(value && (selectedCityText!==value))
    {
        const listOfCities = await getCitiesUsingGeoLocation(value);
        let option = "";
        for(let {lat, lon , name, state, country} of listOfCities)
        {
            option += `
            <option data-city-details='${JSON.stringify({lat,lon,name})}' value="${name} , ${state} , ${country}"></option>
            `
        }

        document.querySelector("#cities").innerHTML = option;
    }
    

}

const handleCitySelection = (event) => {
    selectedCityText = event.target.value;
    let options = document.querySelectorAll("#cities > option");
    if(options?.length)
    {
        let selectedOption = Array.from(options).find(op => op.value === selectedCityText);
        if(selectedOption)
        {
            selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
            loadData();
        }
    }
}

const loadForecastUsingGeo = () => {
    navigator.geolocation.getCurrentPosition(({coords})=> {
        const {latitude: lat,longitude: lon} = coords;
        selectedCity = {lat,lon};
        loadData();
    },error => console.log(error))
}

const loadData = async() => {
    const currentWeather = await getCurrentWeatherStatus(selectedCity);
    loadCurrentForecast(currentWeather);
    const hourlyWeather = await getHourlyForcast(currentWeather);
    loadHourlyForecast(currentWeather,hourlyWeather);

    loadDayWiseForecast(hourlyWeather);

    loadFeelLike(currentWeather);

    loadHumidity(currentWeather);
}


document.addEventListener("DOMContentLoaded", async () => {
    loadForecastUsingGeo();
    const search = document.querySelector("#search");
    search.addEventListener("input",debounce((event) => {onSearchChange(event)}));
    search.addEventListener("change",handleCitySelection);
})

// ccebaf29d9573f2fa3baade304d4fb80
