async function run() {
    try {
        console.log("Logging in...");
        const loginRes = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'warehouse1', password: 'warehouse1' })
        });
        const loginData = await loginRes.json();
        const token = loginData.data?.token || loginData.token;
        if (!token) {
            console.log("Failed to get token:", loginData);
            return;
        }

        console.log("Getting deliveries...");
        const getRes = await fetch('http://localhost:8080/api/deliveries', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const getData = await getRes.json();
        const deliveries = getData.data;
        if (!deliveries || deliveries.length === 0) {
            console.log("No deliveries found");
            return;
        }

        const target = deliveries.find(d => d.trackingNumber === 'DEL-8ADF456B' || d.status === 'DISPATCHED');
        if (!target) {
            console.log("No target delivery found");
            return;
        }

        console.log(`Updating delivery ${target.id} (${target.trackingNumber})...`);
        const patchRes = await fetch(`http://localhost:8080/api/deliveries/${target.id}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'IN_TRANSIT', currentLocation: 'Updated via UI' })
        });
        const patchData = await patchRes.json();
        console.log("PATCH Response Status:", patchRes.status);
        console.log("PATCH Response Body:", patchData);
    } catch (err) {
        console.error("Error:", err);
    }
}
run();
