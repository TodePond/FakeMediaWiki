<script lang="jsx">
import { ref } from 'vue'

export default {
  setup() {
    const count = ref(0)

    const increment = () => {
      count.value++
    }

    return () => (
      <section>
        <p>Count: {count.value}</p>
        <button onClick={increment}>Increment</button>
      </section>
    )
  },
}
</script>

<style scoped>
section {
  padding: 1rem;
  border: 1px solid #ccc;
}
</style>
