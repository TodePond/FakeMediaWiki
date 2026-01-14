<script lang="jsx">
import { CdxButton } from '@wikimedia/codex'
import { ref } from 'vue'

export default {
  setup() {
    const count = ref(0)

    const increment = () => {
      count.value += 1
    }

    return () => (
      <section>
        <p>Count: {count.value}</p>
        <CdxButton onClick={increment}>Increment</CdxButton>
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
