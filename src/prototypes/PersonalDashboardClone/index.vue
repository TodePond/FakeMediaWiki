<template>
	<main class="personal-dashboard-clone">
		<div class="dashboard-mobile-banner">
			<a
				href="#"
				target="_blank"
				rel="noopener noreferrer"
				class="dashboard-mobile-banner__feedback"
			>
				Share feedback
				<CdxIcon :icon="cdxIconLinkExternal" size="x-small" />
			</a>
		</div>
		<!-- Mobile: simplified card modules -->
		<div class="dashboard-mobile-cards">
			<RouterLink
				to="/Special/ReviewChanges"
				class="mobile-card mobile-card--link"
			>
				<div class="mobile-card__header">
					<span class="mobile-card__title">Review changes</span>
					<CdxIcon :icon="cdxIconArrowNext" size="medium" class="mobile-card__arrow" />
				</div>
				<div class="mobile-card__content">
					<CdxIcon :icon="cdxIconEdit" size="small" class="mobile-card__content-icon" />
					<span class="mobile-card__content-text">
						<template v-if="sampleRevision">
							{{ sampleRevision.user.name }} changed bytes in
							{{ sampleRevision.pageName ? `the ${sampleRevision.pageName} article` : "an article" }}.
						</template>
						<template v-else-if="isLoading">
							Loading edits…
						</template>
						<template v-else>
							No edits to review right now.
						</template>
					</span>
				</div>
				<span class="mobile-card__button">View more edits</span>
			</RouterLink>

			<section class="mobile-card">
				<div class="mobile-card__header">
					<span class="mobile-card__title">Your impact</span>
				</div>
				<div class="mobile-card__content mobile-card__content--stacked">
					<div class="mobile-card__stat">
						<CdxIcon :icon="cdxIconUserTalk" size="small" class="mobile-card__stat-icon" />
						<a
							:href="thanksLogUrl"
							target="_blank"
							rel="noopener noreferrer"
							class="mobile-card__stat-link"
							>0</a
						>
						<span>Thanks sent.</span>
					</div>
					<div class="mobile-card__stat">
						<CdxIcon :icon="cdxIconCheckAll" size="small" class="mobile-card__stat-icon" />
						<span class="mobile-card__stat-value">0</span>
						<span>Edits reviewed.</span>
						<CdxIcon :icon="cdxIconInfo" size="small" class="mobile-card__stat-info" />
					</div>
				</div>
			</section>

			<a href="#" class="mobile-card mobile-card--link">
				<div class="mobile-card__header">
					<span class="mobile-card__title">Policies and guidelines</span>
					<CdxIcon :icon="cdxIconArrowNext" size="medium" class="mobile-card__arrow" />
				</div>
				<div class="mobile-card__content">
					<span class="mobile-card__content-text">
						Review best practices to create a free and reliable encyclopedia.
					</span>
				</div>
			</a>
		</div>

		<!-- Desktop: full dashboard -->
		<div class="dashboard-main">
			<ReviewChangesFeed
				ref="reviewChangesFeedRef"
				:show-revert-risk="showRevertRiskInFeed"
				:feed-cap="6"
				title="Review changes"
			/>

			<aside class="dashboard-sidebar">
				<section class="sidebar-card your-impact">
					<div class="sidebar-card__title">Your impact</div>
					<div class="your-impact__metrics">
						<div class="your-impact__metric">
							<div class="your-impact__value-row">
								<CdxIcon :icon="cdxIconUserTalk" class="your-impact__icon" />
								<a
									:href="thanksLogUrl"
									target="_blank"
									rel="noopener noreferrer"
									class="your-impact__value your-impact__value-link"
									>0</a
								>
							</div>
							<span class="your-impact__label">Thanks sent</span>
						</div>
						<div class="your-impact__divider" aria-hidden="true"></div>
						<div class="your-impact__metric">
							<div class="your-impact__value-row">
								<CdxIcon :icon="cdxIconCheckAll" class="your-impact__icon" />
								<span class="your-impact__value">0</span>
							</div>
							<span class="your-impact__label-row">
								<span class="your-impact__label">Edits reviewed</span>
								<CdxIcon
									:icon="cdxIconInfo"
									size="small"
									class="your-impact__info"
								/>
							</span>
						</div>
					</div>
				</section>

				<section class="sidebar-card show-revert-risk-card">
					<label class="show-revert-risk-card__label">
						<input
							v-model="showRevertRiskInFeed"
							type="checkbox"
							class="show-revert-risk-card__input"
						/>
						<span class="show-revert-risk-card__text">Debug revert risk</span>
					</label>
				</section>

				<section class="sidebar-card policies">
					<div class="sidebar-card__title">Policies and guidelines</div>
					<p class="policies__intro">
						Check what is acceptable and expected on Wikipedia.
					</p>
					<div class="policies__box">
						<ul class="policies__list">
							<li class="policies__item">
								<strong class="policies__item-title">Neutral point of view</strong>
								<span class="policies__item-desc"
									>Content must represent significant views fairly,
									proportionately, and without bias.<a
										href="#"
										class="policies__examples"
										>Examples</a
									></span
								>
							</li>
							<li class="policies__item">
								<strong class="policies__item-title">No original research</strong>
								<span class="policies__item-desc"
									>Articles should summarise published sources, and not contain
									users' own interpretation or knowledge.<a
										href="#"
										class="policies__examples"
										>Examples</a
									></span
								>
							</li>
							<li class="policies__item">
								<strong class="policies__item-title">Verifiability</strong>
								<span class="policies__item-desc"
									>New additions should include a citation, providing the source
									of the information.<a href="#" class="policies__examples"
										>Examples</a
									></span
								>
							</li>
							<li class="policies__item">
								<strong class="policies__item-title">Assume good faith</strong>
								<span class="policies__item-desc"
									>Remember that most users are trying to improve Wikipedia and
									not deliberately reduce its quality.<a
										href="#"
										class="policies__examples"
										>Examples</a
									></span
								>
							</li>
						</ul>
					</div>
				</section>
			</aside>
		</div>
	</main>
</template>

<script setup lang="ts">
import ReviewChangesFeed from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { CdxIcon } from "@wikimedia/codex"
import {
	cdxIconArrowNext,
	cdxIconCheckAll,
	cdxIconEdit,
	cdxIconInfo,
	cdxIconLinkExternal,
	cdxIconUserTalk,
} from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import { computed, ref, watch } from "vue"
import { RouterLink } from "vue-router"

const wiki = new FakeWiki()

const THANKS_LOG_USER = "Todepond"
const thanksLogUrl = computed(
	() =>
		`${wiki.base}w/index.php?title=${wiki.encodeForUrl("Special:Log")}&type=thanks&user=${encodeURIComponent(THANKS_LOG_USER)}`
)

const SHOW_REVERT_RISK_STORAGE_KEY = "personal-dashboard-clone-show-revert-risk"

function getStoredShowRevertRisk(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_REVERT_RISK_STORAGE_KEY)
		return stored === "true"
	} catch {
		return false
	}
}

const showRevertRiskInFeed = ref(getStoredShowRevertRisk())

watch(showRevertRiskInFeed, enabled => {
	try {
		localStorage.setItem(SHOW_REVERT_RISK_STORAGE_KEY, String(enabled))
	} catch {
		// ignore
	}
})

const reviewChangesFeedRef = ref<InstanceType<typeof ReviewChangesFeed> | null>(null)

const sampleRevision = computed(() => {
	const inst = reviewChangesFeedRef.value as
		| { sampleRevision?: { value: unknown } }
		| null
	return (inst?.sampleRevision?.value ?? null) as import("fakewiki/types").FWRevision | null
})
const isLoading = computed(() => {
	const inst = reviewChangesFeedRef.value as { isLoading?: { value: boolean } } | null
	return inst?.isLoading?.value ?? false
})
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
