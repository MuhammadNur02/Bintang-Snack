import asyncio
from playwright.async_api import async_playwright

async def run_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Enable console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        try:
            # Set mobile viewport
            await page.set_viewport_size({"width": 375, "height": 667})

            # Navigate to Expo web preview
            await page.goto("http://localhost:3000")
            print("Opened web preview successfully")

            # Wait for app loaded
            await page.wait_for_selector('[data-testid="main-container"]', timeout=15000)
            print("Main container loaded successfully")

            # Test 1: Verify items are listed and titip can be > 1
            await page.wait_for_selector('[data-testid="item-card-0"]', timeout=5000)
            print("Item cards rendered successfully")

            # Test 2: Click 'Tambah Item' to open modal
            await page.click('[data-testid="add-item-header-btn"]', force=True)
            await page.wait_for_selector('[data-testid="item-form-modal"]', timeout=3000)
            print("Add Item modal opened successfully")

            # Check photo picker button & input fields
            assert await page.is_visible('[data-testid="pick-image-btn"]')
            assert await page.is_visible('[data-testid="input-whatsapp"]')
            assert await page.is_visible('[data-testid="input-titip"]')
            assert await page.is_visible('[data-testid="input-sisa"]')
            print("All required input fields and photo picker button are visible")

            # Fill in form details with titip > 1 and WhatsApp
            await page.fill('[data-testid="input-penitip"]', "TEST_Ibu Ani")
            await page.fill('[data-testid="input-whatsapp"]', "081299998888")
            await page.fill('[data-testid="input-item-name"]', "TEST_Kue Sus Kering")
            await page.fill('[data-testid="input-harga-pokok"]', "3000")
            await page.fill('[data-testid="input-harga-jual"]', "5000")
            await page.fill('[data-testid="input-titip"]', "12")
            await page.fill('[data-testid="input-sisa"]', "2")

            # Verify live calculation preview
            await page.wait_for_selector('[data-testid="live-calc-preview"]', timeout=2000)
            print("Live calculation preview visible")

            # Submit form
            await page.click('[data-testid="submit-item-btn"]', force=True)
            await page.wait_for_timeout(1000)
            print("New item submitted successfully")

            # Test 3: Verify WhatsApp Share button on newly created or existing item
            await page.wait_for_selector('[data-testid="whatsapp-share-item-1"]', timeout=5000)
            await page.click('[data-testid="whatsapp-share-item-1"]', force=True)
            print("WhatsApp share button clicked successfully")

            # Test 4: Navigate to Summary Tab (Rekap Setoran)
            await page.click('[data-testid="tab-summary"]', force=True)
            await page.wait_for_selector('[data-testid="recap-view"]', timeout=3000)
            print("Navigated to Rekap Setoran tab successfully")

            # Take verification screenshot
            await page.screenshot(path="/tmp/test_jastip_result.png", quality=40, full_page=False)
            print("Test completed successfully without errors!")

        except Exception as e:
            print(f"Error during frontend testing: {str(e)}")
            await page.screenshot(path="/tmp/error_state.png", quality=40, full_page=False)
            raise e
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run_test())
