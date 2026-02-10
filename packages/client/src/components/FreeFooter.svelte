<script>
  import { Link } from "@budibase/bbui"
</script>

<div class="free-footer">
  <div class="foss">Free and open source</div>
  <Link href="https://github.com/SuperToolMake/supertoolmake" target="_blank">
    Made with <span>SuperToolMake</span>
  </Link>
</div>

<style>
  .free-footer {
    min-height: 51px;
    flex: 0 0 auto;
    padding: 16px 20px;
    border-top: 1px solid var(--spectrum-global-color-gray-300);
    background: var(--spectrum-alias-background-color-primary);
    display: flex;
    justify-content: space-between;
  }
  .free-footer :global(.spectrum-Link) {
    text-decoration: none;
    color: var(--spectrum-global-color-gray-900);
    transition: color 130ms ease-out;
  }
  .free-footer :global(.spectrum-Link):hover {
    color: var(--spectrum-global-color-blue-400);
  }
  span {
    font-weight: bold;
  }
  .foss {
    font-size: small;
    font-style: italic !important;
  }
</style>
