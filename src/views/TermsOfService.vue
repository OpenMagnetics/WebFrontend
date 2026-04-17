<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <div class="container text-white tos-body">

            <h1 style="font-weight: bold;">Terms of Service</h1>
            <p>Last Updated: April 2026</p>

            <p>
                Please read these Terms of Service ("Terms") carefully before using OpenMagnetics.
                By accessing or using the platform you agree to be bound by them.
                If you do not agree, do not use the service.
            </p>

            <h2 style="font-weight: normal;">1. What Is OpenMagnetics</h2>
            <p>
                OpenMagnetics is a free, open-source web platform for designing and simulating magnetic components
                (inductors, transformers, common-mode chokes, and related topologies).
                The source code is publicly available and the service is provided free of charge.
                OpenMagnetics is operated by an individual developer, not a corporation.
            </p>

            <h2 style="font-weight: normal;">2. Engineering Disclaimer — Read This</h2>
            <p>
                <strong>The tool is provided for informational and educational purposes only.</strong>
                Results produced by OpenMagnetics — including winding specifications, loss estimates,
                thermal projections, and any other outputs — are simulation estimates based on simplified
                analytical models and publicly available data. They are <strong>not</strong> a substitute for
                professional engineering judgement.
            </p>
            <p>
                Before using any design in a real product you must independently verify all results with
                appropriate testing, simulation, and review by a qualified electrical engineer.
                OpenMagnetics accepts no responsibility for designs used in actual products, prototypes,
                or any system where failure could cause harm, damage, or financial loss.
            </p>
            <p>
                <strong>In short: this is a calculator, not a certified design service. Verify everything.</strong>
            </p>

            <h2 style="font-weight: normal;">3. Anonymized Design Data &amp; AI Training</h2>
            <p>
                When you use the online design tools, the technical parameters you enter
                (core geometry, winding specifications, operating conditions, etc.) are
                <strong>anonymized</strong> — all links to your identity are stripped before storage —
                and contributed to a publicly available dataset used for magnetics research and
                AI model training.
            </p>
            <p>
                This is done on the basis of <strong>legitimate interest</strong> (GDPR Art. 6(1)(f)):
                the dataset is genuinely anonymous and cannot be reversed to identify you;
                it is already publicly available; and every user of OpenMagnetics benefits from
                the improved models it enables. Because the data is irreversibly anonymous it is
                not subject to erasure requests.
            </p>
            <p>
                If you prefer that your design data remain entirely private, OpenMagnetics is
                fully open source and self-hostable — your data will never leave your own
                infrastructure. Contact <a href="mailto:openmagnetics@protonmail.com">openmagnetics@protonmail.com</a>
                if you need help setting it up.
            </p>

            <h2 style="font-weight: normal;">4. Intellectual Property</h2>
            <p>
                The OpenMagnetics platform, codebase, and documentation are released under their
                respective open-source licences (see the
                <a href="https://github.com/OpenMagnetics/" target="_blank" rel="noopener noreferrer">GitHub repositories</a>
                for the applicable licence of each component).
            </p>
            <p>
                You retain full ownership of the magnetic designs you create. By submitting a bug report
                you grant OpenMagnetics a non-exclusive, royalty-free licence to use the attached design
                data solely for the purpose of diagnosing and fixing the reported issue.
            </p>

            <h2 style="font-weight: normal;">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul style="font-size: 15px;" type="disc">
                <li>Use the service to build a competing commercial product without complying with the open-source licence.<br><br></li>
                <li>Scrape, crawl, or systematically download data or outputs at a rate that disrupts the service for other users.<br><br></li>
                <li>Attempt to reverse-engineer or extract proprietary third-party core material data in bulk.<br><br></li>
                <li>Use the service in any way that violates applicable law.</li>
            </ul>

            <h2 style="font-weight: normal;">6. No Warranty</h2>
            <p>
                The service is provided <strong>"as is"</strong> and <strong>"as available"</strong>,
                without warranty of any kind — express or implied — including but not limited to
                merchantability, fitness for a particular purpose, accuracy, or non-infringement.
                We do not warrant that the service will be uninterrupted, error-free, or free of
                harmful components.
            </p>

            <h2 style="font-weight: normal;">7. Limitation of Liability</h2>
            <p>
                To the fullest extent permitted by applicable law, OpenMagnetics and its operator
                shall not be liable for any indirect, incidental, special, consequential, or punitive
                damages — including loss of profits, data, or goodwill — arising from your use of
                (or inability to use) the service, even if advised of the possibility of such damages.
            </p>
            <p>
                In no event shall the total liability of OpenMagnetics exceed the amount you paid
                for the service in the twelve months preceding the claim. Since the service is free,
                that amount is zero.
            </p>

            <h2 style="font-weight: normal;">8. Third-Party Services</h2>
            <p>
                The platform integrates third-party services (analytics, core material databases,
                simulation libraries). These are governed by their own terms and privacy policies.
                OpenMagnetics is not responsible for the practices of third-party providers.
            </p>

            <h2 style="font-weight: normal;">9. Availability &amp; Changes</h2>
            <p>
                We reserve the right to modify, suspend, or discontinue the service at any time
                without notice. We may also update these Terms; continued use of the service after
                an update constitutes acceptance of the revised Terms.
                The date at the top of this page indicates when the Terms were last changed.
            </p>

            <h2 style="font-weight: normal;">10. Governing Law</h2>
            <p>
                These Terms are governed by the laws of Spain and, where applicable, the laws of
                the European Union (including GDPR). Any dispute shall be subject to the exclusive
                jurisdiction of the courts of Spain.
            </p>

            <h2 style="font-weight: normal;">11. Contact</h2>
            <p>
                Questions about these Terms? Reach us at
                <a href="mailto:openmagnetics@protonmail.com">openmagnetics@protonmail.com</a>.
            </p>

        </div>
        <Footer class="mt-auto"/>
    </div>
</template>

<style scoped>
.tos-body {
    padding-top: 5rem;
    padding-bottom: 3rem;
    max-width: 860px;
}
.tos-body h2 {
    margin-top: 2rem;
}
.tos-body a {
    color: var(--bs-primary);
}
</style>
