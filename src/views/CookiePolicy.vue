<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
</script>

<template>
      <div class="d-flex flex-column min-vh-100">
            <Header />
            <div class="container text-white">
                  <div class="legal-title">
                        <h1 class="xl">Cookie Policy</h1>
                  </div>
                  <p>Last Updated: February 2026</p>

                  <div class="item-element-legal">
                        <h4><strong>What Are Cookies?</strong></h4>
                        <p>Cookies are small text files stored on your device when you visit a website. They help the site work properly, remember your preferences, and understand how visitors use the site. Cookies cannot harm your device.</p>
                  </div>

                  <div class="item-element-legal">
                        <h4><strong>How We Use Cookies</strong></h4>
                        <p>OpenMagnetics uses cookies only for essential site functionality and analytics. We do <strong>not</strong> use cookies to collect personal information, for advertising, remarketing, or user profiling.</p>
                  </div>

                  <div class="item-element-legal">
                        <h4><strong>Types of Cookies We Use</strong></h4>

                        <p><strong>By owner:</strong></p>
                        <ul role="list">
                              <li><strong>First-party cookies:</strong> Set by OpenMagnetics to enable core website features.</li>
                              <li><strong>Third-party cookies:</strong> Set by our analytics provider (Google Analytics) to help us understand site usage.</li>
                        </ul>

                        <p><strong>By purpose:</strong></p>
                        <ul role="list">
                              <li><strong>Essential cookies:</strong> Required for the website to function (e.g., session management, security).</li>
                              <li><strong>Analytics cookies:</strong> Help us measure and improve website performance by collecting anonymized usage data.</li>
                        </ul>

                        <p><strong>By duration:</strong></p>
                        <ul role="list">
                              <li><strong>Session cookies:</strong> Temporary; deleted when you close your browser.</li>
                              <li><strong>Persistent cookies:</strong> Remain on your device until they expire or you delete them.</li>
                        </ul>
                  </div>

                  <div class="item-element-legal">
                        <h4><strong>Cookies in Detail</strong></h4>
                        <div class="html-embed-8 w-embed">
                              <div class="CookieDeclarationType" lang="en" dir="ltr">
                                    <table class="CookieDeclarationTable">
                                          <colgroup>
                                                <col style="width: 20%">
                                                <col style="width: 20%">
                                                <col style="width: 15%">
                                                <col style="width: 35%">
                                                <col style="width: 10%">
                                          </colgroup>
                                          <thead>
                                                <tr>
                                                      <th scope="col" class="CookieDeclarationTableHeader" dir="ltr">Provider</th>
                                                      <th scope="col" class="CookieDeclarationTableHeader" dir="ltr">Cookie Name</th>
                                                      <th scope="col" class="CookieDeclarationTableHeader" dir="ltr">Type</th>
                                                      <th scope="col" class="CookieDeclarationTableHeader" dir="ltr">Purpose</th>
                                                      <th scope="col" class="CookieDeclarationTableHeader" dir="ltr">Expiry</th>
                                                </tr>
                                          </thead>
                                          <tbody>
                                                <tr>
                                                      <td class="CookieDeclarationTableCell">Google Analytics</td>
                                                      <td class="CookieDeclarationTableCell">_ga<br>_gid<br>_gat</td>
                                                      <td class="CookieDeclarationTableCell">Third-party, analytics, persistent</td>
                                                      <td class="CookieDeclarationTableCell">Collects anonymized data about how visitors use the site (pages visited, visit duration, traffic sources). No personal data such as names or addresses is collected.</td>
                                                      <td class="CookieDeclarationTableCell">Up to 2 years (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>)</td>
                                                </tr>
                                          </tbody>
                                    </table>
                              </div>
                        </div>
                  </div>

                  <div class="item-element-legal">
                        <h4><strong>How to Manage Cookies</strong></h4>
                        <p>You can allow, block, or delete cookies through your browser settings. Please note that disabling cookies may affect site functionality.</p>
                        <ul role="list">
                              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" class="text-link">Firefox</a></li>
                              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" class="text-link">Chrome</a></li>
                              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/manage-cookies-in-microsoft-edge-view-allow-block-delete-and-use-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" class="text-link">Microsoft Edge</a></li>
                              <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" class="text-link">Safari</a></li>
                              <li><a href="https://help.opera.com/en/latest/web-preferences/#cookies" target="_blank" rel="noopener noreferrer" class="text-link">Opera</a></li>
                        </ul>
                  </div>

                  <div class="item-element-legal">
                        <h4><strong>Do We Profile Users?</strong></h4>
                        <p>No. We do not perform any profiling or behavioral targeting.</p>
                  </div>

                  <div class="item-element-legal">
                        <h4><strong>International Data Transfers</strong></h4>
                        <p>Google Analytics may transfer data to servers outside the EEA. Google provides appropriate safeguards (Standard Contractual Clauses) in compliance with GDPR. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" class="text-link">Google's Privacy Policy</a> for details.</p>
                  </div>

                  <div class="item-element-legal">
                        <h4><strong>Contact</strong></h4>
                        <p>Questions about our cookie policy? Reach us at <a href="mailto:openmagnetics@protonmail.com">openmagnetics@protonmail.com</a>.</p>
                  </div>
            </div>
         <Footer class="mt-auto"/>
      </div>
</template>
