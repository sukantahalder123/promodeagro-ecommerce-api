const axios = require('axios');

let pincodes = [
    '500038', '500080', '500068', '500051', '500022',
    '500012', '500052', '500023', '500004', '500066',
    '501301', '500095', '500057', '500017', '500031',
    '500006', '500002', '500026', '500082', '500073',
    '500005', '500071', '500007', '500048', '500035',
    '500018', '500036', '500034', '500059', '500013',
    '500081', '500053', '500029', '500061', '101011',
    '500075', '500001', '500065', '500063', '500045',
    '500074', '500008', '500077', '500079', '500069',
    '500076', '500041', '500003', '500040', '500016',
    '500025', '500027', '500064', '500058', '500033',
    '500070', '500020', '500085', '500062', '500039',
    '500028', '500067', '500015', '500024', '500060',
    '500044', '500091', '500030'
];
let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.admin.promodeagro.com/pincode',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJraWQiOiIyUEsySUZRM3o4VGZjOFQrR0w4WFFOMmY0cDljRXpReEZRMFdwNUZLdDVVPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJjMTUzYWQ5YS1iMGIxLTcwZjUtOTYwNS0xMTZkYmJhNjMyMjMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtc291dGgtMS5hbWF6b25hd3MuY29tXC9hcC1zb3V0aC0xX2VRQWlkVWVuciIsImNsaWVudF9pZCI6IjFiMjVzYTRvNHFvN3VtN2ZubWI2ZGlhZTU4Iiwib3JpZ2luX2p0aSI6ImNmYzFjZmI5LWRhMGEtNDY2Mi1hZDE2LTFlNmM3ZTM4ZGFjMSIsImV2ZW50X2lkIjoiZTI3NjU1M2ItM2NjMC00YmZkLWFhYTEtNTQzYzQzOGI0OGY2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTczNjE1ODE1OSwiZXhwIjoxNzM2MjQ0NTU5LCJpYXQiOjE3MzYxNTgxNTksImp0aSI6ImZjMTM5OTk0LTQ1YTAtNGU2Ni04ODJhLWEzMTQ3ODY4MDRkOSIsInVzZXJuYW1lIjoiYzE1M2FkOWEtYjBiMS03MGY1LTk2MDUtMTE2ZGJiYTYzMjIzIn0.uInoRVhkkkS0mHZOUItCMmx22wxP9uzHkk9Q8xzC9i6P9hnUjHea6_mXjhCjPzxUQPDest7a5xBbB62O7WRIm8gk8K3l0f5-gh_2SB8aHKQ_aNNjGc1jPld6jxDa95ybWQ8BxiiifA7X6JzMrs_hytZRbQWVDDQx9ljAMDAynG9yQ75aek2kMZBo8s2YE1_BUjL6isCDJ6fXsbZzS5zzp133FKTRbaMqjvzLSZQeNI11MsPf8OsiFi0kJQUSgFhCIEPMeNeLXJF08x9cLWOXPEVoSVjwxrTX3Zy3BhbHJ-yspneTIEpuWSsTLVVZ51_ldnEhmL9R1j8fBP62iVv6JQ'
    }
};

pincodes.forEach(pincode => {
    let data = JSON.stringify({
        "pincode": pincode,
        "deliveryType": "same day",
        "active": true,
        "shifts": [
            {
                "name": "Morning",
                "slots": [
                    {
                        "start": "09:00",
                        "end": "11:00",
                        "startAmPm": "AM",
                        "endAmPm": "AM",
                        
                    }
                ]
            },
            {
                "name": "Afternoon",
                "slots": [
                    {
                        "start": "01:00",
                        "end": "03:00",
                        "startAmPm": "PM",
                        "endAmPm": "PM",
                        
                    }
                ]
            },{
                "name": "Evening",
                "slots": [
                    {
                        "start": "04:00",
                        "end": "07:00",
                        "startAmPm": "PM",
                        "endAmPm": "PM",
                        
                    }
                ]
            }
        ]
    });
    
    config.data = data;
    
    axios.request(config)
    .then((response) => {
        console.log(`Response for pincode ${pincode}:`, JSON.stringify(response.data));
    })
    .catch((error) => {
        console.log(`Error for pincode ${pincode}:`, error);
    });
});

console.log(pincodes.length)