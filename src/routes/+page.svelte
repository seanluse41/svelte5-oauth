<script>
    import { onMount } from "svelte";
    import { replaceState } from "$app/navigation";

    let loginState = $state(false);
    let error = $state("");

    const redirectUri = import.meta.env.VITE_REDIRECT_URI;

    onMount(async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");

        if (code) {
            await handleCallback(code, state);
        } else {
            await checkLoginStatus();
        }
    });

    async function logout() {
        try {
            const response = await fetch("/api/auth", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Logout request failed");
            }

            const result = await response.json();
            console.log("Logout response:", result);

            if (result.success) {
                loginState = false;
                error = ""; // Clear any existing errors
                console.log("Logged out successfully");
            } else {
                throw new Error("Logout failed on server");
            }
        } catch (err) {
            console.error("Logout error:", err);
            error = "Failed to logout: " + err.message;
        }

        // Regardless of success or failure, check the login status
        await checkLoginStatus();
    }

    async function checkLoginStatus() {
        try {
            const response = await fetch("/api/auth");
            const data = await response.json();
            console.log("Login status check:", data);
            loginState = data.isAuthenticated;
        } catch (err) {
            console.error("Login status check error:", err);
            error = "Failed to check login status: " + err.message;
        }
    }
    function generateRandomString(length) {
        const possible =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
        return Array.from(crypto.getRandomValues(new Uint8Array(length)))
            .map((x) => possible[x % possible.length])
            .join("");
    }

    async function tryLogin() {
        const codeVerifier = generateRandomString(128);
        sessionStorage.setItem("codeVerifier", codeVerifier);

        try {
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "initiate",
                    codeVerifier,
                    redirectUri,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to initiate login");
            }

            const { authorizationUrl, state } = await response.json();
            sessionStorage.setItem("state", state); // Store state temporarily
            window.location.href = authorizationUrl;
        } catch (err) {
            error = err.message;
        }
    }

    async function handleCallback(code, state) {
        const storedState = sessionStorage.getItem("state");
        const codeVerifier = sessionStorage.getItem("codeVerifier");

        if (state !== storedState) {
            error = "Invalid state parameter";
            return;
        }
        try {
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "token",
                    code,
                    redirectUri,
                    codeVerifier,
                    state,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Failed to fetch access token",
                );
            }

            loginState = true;

            // Clear the URL parameters and sessionStorage
            replaceState("/", {});
            sessionStorage.removeItem("state");
            sessionStorage.removeItem("codeVerifier");
        } catch (err) {
            error = err.message;
        }
        // Check login status after attempting to handle callback
        await checkLoginStatus();
    }
</script>

<h1 class="text-3xl font-bold">Kintone OAuth 2.0</h1>

{#if error}
    <p class="text-red-500">Error: {error}</p>
{/if}

{#if loginState}
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
        onclick={tryLogin}
    >
        Login with Kintone
    </button>
{/if}

<p>Login Status: {loginState ? "Logged In" : "Not Logged In"}</p>
