<script>
  import "../app.css";
  const { children } = $props();

</script>

<div class="flex flex-col min-h-screen bg-whitesmoke relative p-12">
  {@render children()}
</div>

<style lang="postcss">
  :global(body) {
    background-color: cornsilk;
  }
</style>
