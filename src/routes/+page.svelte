<script>
    import { onMount } from "svelte";
    import { replaceState } from "$app/navigation";

    const { data } = $props();
    let isAuthenticated = $state(data.isAuthenticated);
    let kintoneData = $state([]);
    let error = $state("");

    const redirectUri = import.meta.env.VITE_REDIRECT_URI;

    onMount(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");
        const errorParam = urlParams.get("error");
        const errorDescription = urlParams.get("error_description");

        if (errorParam) {
            error = `${errorParam}: ${errorDescription}`;
        } else if (code && state) {
            handleCallback(code, state);
        }
    });

    async function logout() {
        try {
            const response = await fetch("/api/auth", { method: "DELETE" });
            if (response.ok) {
                isAuthenticated = false;
            } else {
                throw new Error("Logout failed");
            }
        } catch (err) {
            console.error("Logout error:", err);
            error = "Failed to logout: " + err.message;
        }
    }

    async function login() {
        try {
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redirectUri }),
            });

            if (!response.ok) throw new Error("Failed to initiate login");

            const { authorizationUrl } = await response.json();
            window.location.href = authorizationUrl;
        } catch (err) {
            error = err.message;
        }
    }

    async function handleCallback(code, state) {
        try {
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, state, redirectUri }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Failed to complete authentication",
                );
            }

            isAuthenticated = true;
            replaceState("/", {});
        } catch (err) {
            error = err.message;
        }
    }

    async function getRecords() {
        try {
            const response = await fetch("/api/getRecords");
            if (!response.ok) {
                throw new Error("Failed to fetch records");
            }
            const data = await response.json();
            console.log("Fetched records:", data);
            kintoneData = data.records;
        } catch (error) {
            console.error("Error fetching records:", error);
        }
    }
</script>

<h1 class="text-3xl font-bold">Kintone OAuth 2.0</h1>

{#if error}
    <p class="text-red-500">Error: {error}</p>
{/if}

{#if isAuthenticated}
    <p class="text-green-500">You are logged in!</p>
    <button
        class="text-xl bg-blue-600 text-white w-1/4 self-center py-5 rounded hover:bg-blue-500"
        onclick={logout}
    >
        Logout
    </button>
{:else}
    <button
        class="text-xl bg-red-600 text-white w-1/4 self-center py-5 rounded hover:bg-red-500"
        onclick={login}
    >
        Login with Kintone
    </button>
{/if}

{#if isAuthenticated}
    <button
        class="text-xl bg-red-600 text-white w-1/4 self-center py-5 rounded hover:bg-red-500"
        onclick={getRecords}
    >
        Get Some Kintone Records
    </button>
{/if}

<h2>Record Data:</h2>
{#if kintoneData.length > 0}
    <div class="flex">
        {#each kintoneData as record (record.$id.value)}
            <div class="p-5 bg-white m-2 rounded flex-wrap">
                <p>Product Name: {record.name.value}</p>
                <p>Price: ${record.price.value}</p>
                <p>Description: {@html record.product_description.value}</p>
            </div>
        {/each}
    </div>
{:else}
    <p>
        No records to display. Click "Get Some Kintone Records" to fetch data.
    </p>
{/if}
