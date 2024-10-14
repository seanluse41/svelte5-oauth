<script>
    let loginState = $state(false);

    let tryLogin = () => {
        console.log("trying login")
    }
</script>

<h1 class="text-3xl font-bold">Kintone Oauth 2.0</h1>
<button
    class="text-xl bg-red-600 text-white w-1/4 self-center py-5 rounded hover:bg-red-500"
    onclick={tryLogin}
    >Login with Kintone</button
>

<p>Login Status: {loginState}</p>
