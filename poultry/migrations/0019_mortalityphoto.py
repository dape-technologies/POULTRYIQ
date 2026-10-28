import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("poultry", "0018_backfill_house_bird_ledger"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MortalityPhoto",
            fields=[
                ("photo_id", models.BigAutoField(primary_key=True, serialize=False)),
                ("image", models.ImageField(upload_to="mortality_photos/%Y/%m/%d/")),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "mortality_record",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="photos",
                        to="poultry.mortalityrecord",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="mortality_photos_uploaded",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
