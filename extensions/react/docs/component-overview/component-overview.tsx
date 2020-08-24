import { textColumn } from '@teambit/base-ui-temp.layout.page-frame';
import { ConsumableLink } from '@teambit/documenter-temp.ui.consumable-link';
import { H1 } from '@teambit/documenter-temp.ui.heading';
import { LabelList } from '@teambit/documenter-temp.ui.label-list';
import { Section } from '@teambit/documenter-temp.ui.section';
import { Separator } from '@teambit/documenter-temp.ui.separator';
import { Subtitle } from '@teambit/documenter-temp.ui.sub-title';
import React from 'react';

export type ComponentOverviewProps = {
  displayName: string;
  abstract?: string;
  version: string;
  labels: string[];
  packageName: string;
};

export function ComponentOverview({ displayName, abstract, labels, packageName, ...rest }: ComponentOverviewProps) {
  return (
    <Section {...rest}>
      <div className={textColumn}>
        <H1>{displayName}</H1>
        {abstract && <Subtitle>{abstract}</Subtitle>}
        <LabelList>{labels}</LabelList>
        <ConsumableLink title="Package name" link={packageName}></ConsumableLink>
      </div>
      <Separator />
    </Section>
  );
}
