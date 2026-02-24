<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
</script>

<template>
   <div class="d-flex flex-column min-vh-100">

       <Header />
       <div class="container text-white" style="">
                <br><br>
                <br><br>

          <span>
            <h1 style="font-weight: bold;">Privacy Policy</h1>
            <p>Last Updated: February 2026</p>

            <h2 style="font-weight: normal;">Welcome</h2>
            <p>OpenMagnetics is a free, open-source platform for designing and simulating magnetic components. We respect your privacy and want to be transparent about the data we collect. This policy explains what data we process, why, and your rights regarding it.</p>

            <p><strong>The short version:</strong> We do not sell your personal data. When you use our design tools, the technical parameters you enter (e.g., core shapes, winding configurations, operating conditions) are anonymized and added to a public database to advance magnetics research and AI training. No personal information is included. If you prefer to keep your design data fully private, you can self-host OpenMagnetics — it is open source. Contact us at <a href="mailto:openmagnetics@protonmail.com">openmagnetics@protonmail.com</a> if you need help setting it up.</p>

            <h2 style="font-weight: normal;">1. Controller</h2>
            <p>OpenMagnetics<br>
            E-mail: <a href="mailto:openmagnetics@protonmail.com">openmagnetics@protonmail.com</a></p>

            <h2 style="font-weight: normal;">2. What Data We Collect</h2>
            <p><strong>Technical design data:</strong> Parameters you enter in our design and simulation tools (e.g., core geometry, winding specifications, operating points). This data is anonymized — stripped of any link to your identity — and added to a publicly available database for magnetics research and AI model training.</p>
            <p><strong>Account data (optional):</strong> If you register, we store the information needed to maintain your account (e.g., e-mail address). Registration is never required.</p>
            <p><strong>Usage data:</strong> We collect standard analytics data such as pages visited, access times, browser type, device information, and pseudonymized IP addresses through third-party analytics services.</p>

            <h2 style="font-weight: normal;">3. Legal Bases (GDPR)</h2>
            <ul style="font-size: 15px;" type="disc">
               <li><strong>Consent (Art. 6(1)(a) GDPR):</strong> For analytics cookies and non-essential data processing. You may withdraw consent at any time.<br><br></li>
               <li><strong>Contract performance (Art. 6(1)(b) GDPR):</strong> For processing necessary to provide our services to registered users.<br><br></li>
               <li><strong>Legitimate interests (Art. 6(1)(f) GDPR):</strong> For website security, fraud prevention, and service improvement.</li>
            </ul>

            <h2 style="font-weight: normal;">4. Anonymized Design Data &amp; AI Training</h2>
            <p>Technical design data you enter is anonymized and contributed to a public database. This data is used to train AI models for magnetics design. The training data is publicly accessible. No personal information is ever included in this dataset. By using our online tools, you agree to this anonymized data collection. If you do not agree, you may self-host the open-source version of OpenMagnetics and your data will remain entirely on your own infrastructure.</p>

            <h2 style="font-weight: normal;">5. Cookies</h2>
            <p>We use cookies for essential website functionality and analytics. For full details, please see our <a href="/cookies">Cookie Policy</a>. We will ask for your consent before setting non-essential cookies.</p>

            <h2 style="font-weight: normal;">6. Third-Party Services</h2>
            <p>We use the following third-party services that may process your data:</p>
            <ul style="font-size: 15px;" type="disc">
               <li><strong>Google Analytics:</strong> Web analytics. Provider: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Privacy Policy</a>. <a href="https://tools.google.com/dlpage/gaoptout?hl=en" target="_blank" rel="noopener">Opt-Out Plugin</a>.<br><br></li>
               <li><strong>Google Tag Manager:</strong> Tag management. Provider: Google Ireland Limited. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Privacy Policy</a>.<br><br></li>
               <li><strong>Hotjar:</strong> Usability analysis. Provider: Hotjar Ltd., Dragonara Business Centre, 5th Floor, Dragonara Road, Paceville St Julian's STJ 3141, Malta. <a href="https://www.hotjar.com/legal/policies/privacy" target="_blank" rel="noopener">Privacy Policy</a>. <a href="https://www.hotjar.com/legal/compliance/opt-out" target="_blank" rel="noopener">Opt-Out</a>.</li>
            </ul>

            <h2 style="font-weight: normal;">7. Data Transfers to Third Countries</h2>
            <p>Some of the third-party services listed above may transfer data to countries outside the European Economic Area (EEA), including the United States. Where this occurs, appropriate safeguards (such as Standard Contractual Clauses) are in place to protect your data in accordance with GDPR requirements.</p>

            <h2 style="font-weight: normal;">8. Data Retention</h2>
            <p>Personal data linked to your account is retained for as long as your account is active. Anonymized design data is retained indefinitely as part of the public database. Analytics data is retained according to the default retention periods of the respective third-party services.</p>

            <h2 style="font-weight: normal;">9. Your Rights</h2>
            <p>Under the GDPR, you have the right to:</p>
            <ul style="font-size: 15px;" type="disc">
               <li>Access the personal data we hold about you.<br><br></li>
               <li>Request correction of inaccurate data.<br><br></li>
               <li>Request erasure of your personal data.<br><br></li>
               <li>Restrict or object to processing.<br><br></li>
               <li>Data portability.<br><br></li>
               <li>Withdraw consent at any time (without affecting prior processing).<br><br></li>
               <li>Lodge a complaint with a supervisory authority.</li>
            </ul>
            <p>To exercise any of these rights, contact us at <a href="mailto:openmagnetics@protonmail.com">openmagnetics@protonmail.com</a>.</p>
            <p>Note: Anonymized design data cannot be traced back to you and is therefore not subject to erasure requests.</p>

            <h2 style="font-weight: normal;">10. Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your data, including IP masking (pseudonymization), encrypted connections (TLS/SSL), and access controls.</p>

            <h2 style="font-weight: normal;">11. Changes to This Policy</h2>
            <p>We may update this policy from time to time. Changes will be posted on this page with an updated date. We encourage you to review this page periodically.</p>

            <h2 style="font-weight: normal;">12. Contact</h2>
            <p>For any questions or concerns about this privacy policy or your data, contact us at:<br>
            <a href="mailto:openmagnetics@protonmail.com">openmagnetics@protonmail.com</a></p>
          </span>
       </div>

   <Footer class="mt-auto"/>
</div>
</template>
