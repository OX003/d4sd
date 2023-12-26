import { promisePool } from '../util/promise';
import { ItemRef } from './ItemRef';
import { DigiDoc } from './DigiDoc';
import { Folder } from './Folder';
import { Item } from './Item';
import { defDownloadOptions, DownloadOptions } from './download-options';

export abstract class ItemGroup extends Item {
  async download(outDir: string, _options?: DownloadOptions) {
    const dir = await this.mkSubDir(outDir);
    const options = defDownloadOptions(_options);

    const groupItems = await this.getItems();
    const items = (
      await promisePool(
        async (i) => {
          const item = groupItems[i];
          return item instanceof ItemRef ? await item.resolve() : item;
        },
        options.concurrency,
        groupItems.length
      )
    ).filter((item) => item !== null) as Item[];

    const docs: DigiDoc[] = [];
    const others: Item[] = [];

    for (let item of items) {
      if (item instanceof DigiDoc) {
        docs.push(item);
      } else {
        others.push(item);
      }
    }

    // Document download pool
    await promisePool(
      (i) => docs[i].download(dir),
      options.concurrency,
      docs.length
    );

    // Download other stuff (books / folders) individually
    for (let other of others) {
      await other.download(dir);
    }
  }

  abstract getItems(): Promise<(ItemRef | DigiDoc | Folder)[]>;
}
