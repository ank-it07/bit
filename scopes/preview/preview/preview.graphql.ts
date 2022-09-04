import { Component } from '@teambit/component';
import gql from 'graphql-tag';

import { PreviewMain } from './preview.main.runtime';

export function previewSchema(previewExtension: PreviewMain) {
  return {
    typeDefs: gql`
      type Preview {
        # url: String!
        isScaling: Boolean
        includesEnvTemplate: Boolean
        legacyHeader: Boolean
      }

      extend type Component {
        preview: Preview
      }
    `,
    resolvers: {
      Component: {
        preview: (component: Component) => {
          // return previewExtension.getPreview(component);
          return { component };
        },
      },
      Preview: {
        includesEnvTemplate: ({ component }) => {
          return previewExtension.isBundledWithEnv(component);
        },
        isScaling: ({ component }) => {
          return previewExtension.isScaling(component);
        },
        legacyHeader: ({ component }) => {
          return previewExtension.isLegacyHeader(component);
        },
      },
    },
  };
}
